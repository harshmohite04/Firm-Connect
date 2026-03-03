const Organization = require('../models/Organization');
const razorpay = require('../utils/razorpayConfig');
const User = require('../models/User');
const Case = require('../models/Case');
const TeamInvitation = require('../models/TeamInvitation');
const sendEmail = require('../utils/emailService');
const teamInvitationTemplate = require('../utils/teamInvitationTemplate');
const { organizationInvitationTemplate, organizationExistingUserTemplate, organizationInvitationSetupTemplate } = require('../utils/organizationInvitationTemplate');
const crypto = require('crypto');
const generateToken = require('../utils/generateToken');


// @desc    Get current user's organization
// @route   GET /organization
// @access  Private
const getOrganization = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user.organizationId) {
            return res.status(404).json({
                success: false,
                message: 'You are not part of any organization'
            });
        }

        const org = await Organization.findById(user.organizationId)
            .populate('ownerId', 'firstName lastName email')
            .populate('members.userId', 'firstName lastName email');

        if (!org) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        res.json({ success: true, organization: org });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all members of the organization
// @route   GET /organization/members
// @access  Private
const getMembers = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user.organizationId) {
            return res.status(404).json({
                success: false,
                message: 'You are not part of any organization'
            });
        }

        const org = await Organization.findById(user.organizationId)
            .populate('members.userId', 'firstName lastName email phone role');

        const activeMembers = org.members.filter(m => m.status === 'ACTIVE');

        const activeSeats = org.seats ? org.seats.filter(s => s.status === 'ACTIVE').length : 0;

        res.json({
            success: true,
            members: activeMembers,
            totalSeats: activeSeats,
            usedSeats: activeMembers.filter(m => m.role !== 'ADMIN').length
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Invite a member to the organization
// @route   POST /organization/invite
// @access  Private (Admin only)
const inviteMember = async (req, res, next) => {
    try {
        const { email } = req.body;
        const normalizedEmail = email.toLowerCase();

        const admin = await User.findById(req.user._id);

        if (admin.role !== 'ADMIN') {
            res.status(403);
            throw new Error('Only admins can invite members');
        }

        if (!admin.organizationId) {
            res.status(400);
            throw new Error('You must have an organization to invite members');
        }

        const org = await Organization.findById(admin.organizationId);

        if (!org) {
            res.status(404);
            throw new Error('Organization not found');
        }

        // Check: active members + pending invitations must not exceed active seats
        const activeMembers = org.members.filter(m => m.status === 'ACTIVE' && m.role !== 'ADMIN').length;
        const activeSeats = org.seats ? org.seats.filter(s => s.status === 'ACTIVE').length : 0;
        const pendingInvitations = await TeamInvitation.countDocuments({
            organizationId: org._id, status: 'pending', expiresAt: { $gt: new Date() }
        });
        if (activeMembers + pendingInvitations >= activeSeats) {
            res.status(400);
            throw new Error(`No seats available. You have ${activeSeats} active seat(s) and ${pendingInvitations} pending invitation(s). Buy more seats first.`);
        }

        // Check for duplicate pending invitation
        const existingPending = await TeamInvitation.findOne({
            organizationId: org._id, invitedEmail: normalizedEmail, status: 'pending', expiresAt: { $gt: new Date() }
        });
        if (existingPending) {
            res.status(400);
            throw new Error('Invitation already pending for this email');
        }

        let userToInvite = await User.findOne({ email: normalizedEmail });
        let generatedPassword = null;
        let isNewUser = false;

        if (userToInvite) {
            // Check if already an active member
            const isAlreadyMember = org.members.some(
                m => m.userId && m.userId.toString() === userToInvite._id.toString() && m.status === 'ACTIVE'
            );
            if (isAlreadyMember) {
                res.status(400);
                throw new Error('User is already an active member of your organization');
            }

            // Check if user belongs to another org
            if (userToInvite.organizationId && userToInvite.organizationId.toString() !== org._id.toString()) {
                res.status(400);
                throw new Error('User already belongs to another organization');
            }
        } else {
            // New user — account will be created when they complete setup
            isNewUser = true;
            userToInvite = null;
        }

        // --- Auto-assign the first available unoccupied seat ---
        // Exclude seats already reserved by other pending invitations
        const pendingInvitationsWithSeats = await TeamInvitation.find({
            organizationId: org._id,
            status: 'pending',
            expiresAt: { $gt: new Date() },
            seatId: { $ne: null }
        }).select('seatId');
        const reservedSeatIds = new Set(pendingInvitationsWithSeats.map(inv => inv.seatId.toString()));

        const unoccupiedSeat = org.seats
            ? org.seats.find(s =>
                s.status === 'ACTIVE' &&
                !s.assignedTo &&
                !reservedSeatIds.has(s._id.toString())
            )
            : null;

        // --- CREATE INVITATION RECORD (member is NOT added to org until they accept) ---
        const invitation = new TeamInvitation({
            organizationId: org._id,
            invitedBy: admin._id,
            invitedEmail: normalizedEmail,
            invitedUserId: userToInvite ? userToInvite._id : null,
            token: crypto.randomBytes(32).toString('hex'),
            status: 'pending',
            seatId: unoccupiedSeat ? unoccupiedSeat._id : null,
            seatPlan: unoccupiedSeat ? unoccupiedSeat.plan : null
        });
        await invitation.save();

        // --- EMAIL NOTIFICATION ---
        try {
            const frontendOrigin = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',')[0].trim();
            const loginLink = frontendOrigin + '/signin';

            if (isNewUser) {
                const setupLink = frontendOrigin + '/invite/' + invitation.token + '/setup';
                const htmlContent = organizationInvitationSetupTemplate(org.name, `${admin.firstName} ${admin.lastName}`, setupLink);
                await sendEmail({
                    email: normalizedEmail,
                    subject: `Welcome to ${org.name} on LawFirmConnect`,
                    html: htmlContent,
                    message: `You have been invited to join ${org.name}. Set up your account at ${setupLink}`
                });
            } else {
                const htmlContent = organizationExistingUserTemplate(org.name, `${admin.firstName} ${admin.lastName}`, loginLink);
                await sendEmail({
                    email: normalizedEmail,
                    subject: `You have been added to ${org.name}`,
                    html: htmlContent,
                    message: `You have been added to ${org.name}. Please login at ${loginLink}`
                });
            }
        } catch (emailError) {
            console.error('Failed to send invitation email:', emailError);
        }

        res.status(201).json({
            success: true,
            message: isNewUser
                ? `Invitation sent to ${normalizedEmail}. They will set up their account.`
                : `Invitation sent to ${normalizedEmail}.`,
            member: {
                email: normalizedEmail,
                firstName: userToInvite ? userToInvite.firstName : email.split('@')[0],
                lastName: userToInvite ? userToInvite.lastName : '',
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get pending invitations for the organization
// @route   GET /organization/invitations
// @access  Private (Admin only)
const getInvitations = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user.organizationId) {
            return res.status(404).json({ success: false, message: 'No organization found' });
        }

        const invitations = await TeamInvitation.find({
            organizationId: user.organizationId,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });

        res.json({ success: true, invitations });
    } catch (error) {
        next(error);
    }
};

// @desc    Accept an organization invitation
// @route   POST /organization/invitations/:token/accept
// @access  Private (must be logged in)
const acceptInvitation = async (req, res, next) => {
    try {
        const { token } = req.params;

        const invitation = await TeamInvitation.findOne({
            token,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        }).populate('organizationId');

        if (!invitation) {
            res.status(404);
            throw new Error('Invitation not found or has expired');
        }

        const org = invitation.organizationId;
        if (!org) {
            res.status(404);
            throw new Error('Organization associated with this invitation does not exist');
        }

        // Seat Check: active members (excluding ADMIN) vs active seats
        const activeCount = org.members.filter(m => m.status === 'ACTIVE' && m.role !== 'ADMIN').length;
        const availableSeats = org.seats ? org.seats.filter(s => s.status === 'ACTIVE').length : 0;
        if (activeCount >= availableSeats) {
            res.status(400);
            throw new Error('No seats available in this organization');
        }

        // Get the accepting user
        const acceptingUser = await User.findById(req.user._id);

        if (!acceptingUser) {
            res.status(404);
            throw new Error('User not found');
        }

        // Check email matches
        if (acceptingUser.email.toLowerCase() !== invitation.invitedEmail.toLowerCase()) {
            res.status(403);
            throw new Error('This invitation was sent to a different email address');
        }

        // Check if user already belongs to an org
        if (acceptingUser.organizationId) {
            res.status(400);
            throw new Error('You already belong to an organization. One firm per user.');
        }

        // Update invitation
        invitation.status = 'accepted';
        invitation.acceptedAt = new Date();
        invitation.invitedUserId = acceptingUser._id;
        await invitation.save();

        // Add user to org
        org.members.push({
            userId: acceptingUser._id,
            role: 'ADVOCATE',
            status: 'ACTIVE',
            joinedAt: new Date()
        });

        // Assign the seat that was purchased for this invite
        if (invitation.seatId) {
            const seat = org.seats.id(invitation.seatId);
            if (seat && seat.status === 'ACTIVE') {
                seat.assignedTo = acceptingUser._id;
            }
        }

        await org.save();

        // Update user
        acceptingUser.organizationId = org._id;
        acceptingUser.role = 'ADVOCATE';

        // Activate the plan for the invited user
        if (invitation.seatPlan) {
            acceptingUser.subscriptionPlan = invitation.seatPlan;
            acceptingUser.subscriptionStatus = 'ACTIVE';
            acceptingUser.subscriptionExpiresAt = org.subscriptionExpiresAt;
        }

        await acceptingUser.save();

        res.json({
            success: true,
            message: `You have joined ${org.name}`,
            organization: {
                id: org._id,
                name: org.name
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reject an organization invitation
// @route   POST /organization/invitations/:token/reject
// @access  Public (with token)
const rejectInvitation = async (req, res, next) => {
    try {
        const { token } = req.params;

        // No need for transaction here since it's a single document update
        const invitation = await TeamInvitation.findOne({
            token,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });

        if (!invitation) {
            res.status(404);
            throw new Error('Invitation not found or has expired');
        }

        invitation.status = 'rejected';
        await invitation.save();

        res.json({ success: true, message: 'Invitation declined' });
    } catch (error) {
        next(error);
    }
};

// @desc    Remove a member from the organization (soft remove)
// @route   DELETE /organization/members/:userId
// @access  Private (Admin only)
const removeMember = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const admin = await User.findById(req.user._id);

        if (admin.role !== 'ADMIN') {
            res.status(403);
            throw new Error('Only admins can remove members');
        }

        // Cannot remove yourself
        if (userId === req.user._id.toString()) {
            res.status(400);
            throw new Error('You cannot remove yourself from the organization');
        }

        const org = await Organization.findById(admin.organizationId);

        if (!org) {
            res.status(404);
            throw new Error('Organization not found');
        }

        // Find the member in the org
        const memberIndex = org.members.findIndex(
            m => m.userId.toString() === userId && m.status === 'ACTIVE'
        );

        if (memberIndex === -1) {
            res.status(404);
            throw new Error('Member not found in organization (or already removed)');
        }

        // Soft remove — set status to REMOVED, keep data intact
        org.members[memberIndex].status = 'REMOVED';
        org.members[memberIndex].removedAt = new Date();

        // Clear seat assignment for the removed user
        const assignedSeat = org.seats
            ? org.seats.find(s => s.assignedTo && s.assignedTo.toString() === userId)
            : null;
        if (assignedSeat) {
            assignedSeat.assignedTo = null;
        }

        await org.save();

        // Remove org reference and revoke subscription from user
        const removedUser = await User.findById(userId);
        if (removedUser) {
            removedUser.organizationId = null;
            removedUser.subscriptionStatus = 'INACTIVE';
            removedUser.subscriptionPlan = undefined;
            removedUser.subscriptionExpiresAt = undefined;
            await removedUser.save();
        }

        // Get cases that need reassignment
        const affectedCases = await Case.find({
            organizationId: org._id,
            recordStatus: 1,
            $or: [
                { createdBy: userId },
                { leadAttorneyId: userId },
                { assignedLawyers: userId }
            ]
        }).select('_id title status');

        res.json({
            success: true,
            message: 'Member removed from organization. Their data is preserved.',
            casesNeedingReassignment: affectedCases
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reassign cases from one user to another
// @route   POST /organization/reassign-cases
// @access  Private (Admin only)
const reassignCases = async (req, res, next) => {
    try {
        const { fromUserId, toUserId, caseIds } = req.body;
        const admin = await User.findById(req.user._id);

        if (admin.role !== 'ADMIN') {
            res.status(403);
            throw new Error('Only admins can reassign cases');
        }

        const org = await Organization.findById(admin.organizationId);
        if (!org) {
            res.status(404);
            throw new Error('Organization not found');
        }

        // Verify toUser is an active member
        const isActiveMember = org.members.some(
            m => m.userId.toString() === toUserId && m.status === 'ACTIVE'
        );
        if (!isActiveMember) {
            res.status(400);
            throw new Error('Target user must be an active member of the organization');
        }

        const toUser = await User.findById(toUserId);
        if (!toUser) {
             res.status(404);
             throw new Error('Target user not found');
        }

        // Find cases to update details
        const casesToUpdate = await Case.find({
            _id: { $in: caseIds },
            organizationId: org._id,
            recordStatus: 1
        });

        let modifiedCount = 0;

        for (const caseDoc of casesToUpdate) {
            let needsUpdate = false;

            // Update lead attorney
            if (caseDoc.leadAttorneyId && caseDoc.leadAttorneyId.toString() === fromUserId) {
                caseDoc.leadAttorneyId = toUserId;
                needsUpdate = true;
            }

            // Update createdBy
            if (caseDoc.createdBy.toString() === fromUserId) {
                caseDoc.createdBy = toUserId;
                needsUpdate = true;
            }

            // Replace in assignedLawyers
            if (caseDoc.assignedLawyers.some(id => id.toString() === fromUserId)) {
                  const newAssigned = caseDoc.assignedLawyers.map(id =>
                      id.toString() === fromUserId ? toUserId : id.toString()
                  );
                  // Deduplicate in case toUser was already assigned
                  const uniqueAssigned = [...new Set(newAssigned)];
                  caseDoc.assignedLawyers = uniqueAssigned;
                  needsUpdate = true;
            }

            // Replace in teamMembers array
            let teamChanged = false;
            caseDoc.teamMembers = caseDoc.teamMembers.map(member => {
                if (member.userId.toString() === fromUserId) {
                    teamChanged = true;
                    return { ...member.toObject(), userId: toUserId };
                }
                return member;
            });
            if (teamChanged) needsUpdate = true;

            if (needsUpdate) {
                caseDoc.activityLog.push({
                    type: 'case_reassigned',
                    description: `Case reassigned from removed member to ${toUser.firstName} ${toUser.lastName}`,
                    performedBy: req.user._id,
                    timestamp: new Date()
                });
                await caseDoc.save();
                modifiedCount++;
            }
        }

        res.json({
            success: true,
            message: `${modifiedCount} case(s) reassigned successfully`,
            reassignedCount: modifiedCount
        });
    } catch (error) {
        next(error);
    }
};


// @desc    Get seat info for the organization (seats are now managed via paymentRoutes)
// @route   PATCH /organization/seats
// @access  Private (Admin only)
const updateSeats = async (req, res, next) => {
    try {
        const admin = await User.findById(req.user._id);

        if (admin.role !== 'ADMIN') {
            res.status(403);
            throw new Error('Only admins can manage seats');
        }

        const org = await Organization.findById(admin.organizationId);
        if (!org) {
            res.status(404);
            throw new Error('Organization not found');
        }

        const activeSeats = org.seats ? org.seats.filter(s => s.status === 'ACTIVE').length : 0;

        res.json({
            success: true,
            message: 'Seats are now managed via subscription. Use /payments/create-seat to purchase.',
            activeSeats,
            seats: org.seats
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get public list of organizations (for signup)
// @route   GET /organization/public
// @access  Public
const getPublicOrganizations = async (req, res, next) => {
    try {
        const organizations = await Organization.find({ 
            subscriptionStatus: 'ACTIVE' // Only show active firms? Optional decision.
        }).select('_id name');

        res.json({
            success: true,
            organizations
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Revoke a pending invitation (admin only)
// @route   DELETE /organization/invitations/:invitationId
// @access  Private (Admin only)
const revokeInvitation = async (req, res, next) => {
    try {
        const { invitationId } = req.params;
        const admin = await User.findById(req.user._id);

        if (admin.role !== 'ADMIN') {
            res.status(403);
            throw new Error('Only admins can revoke invitations');
        }

        const invitation = await TeamInvitation.findOne({
            _id: invitationId,
            organizationId: admin.organizationId,
            status: 'pending'
        });

        if (!invitation) {
            res.status(404);
            throw new Error('Invitation not found');
        }

        // Mark invitation as rejected (member was never added to org, so no cleanup needed)
        invitation.status = 'rejected';
        await invitation.save();

        res.json({ success: true, message: 'Invitation revoked' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get invitations sent to the current user
// @route   GET /organization/my-invitations
// @access  Private
const getMyInvitations = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        const invitations = await TeamInvitation.find({
            invitedEmail: user.email.toLowerCase(),
            status: 'pending',
            expiresAt: { $gt: new Date() }
        }).populate('organizationId', 'name');

        res.json({ success: true, invitations });
    } catch (error) {
        next(error);
    }
};

// @desc    Get invitation info by token (for setup page)
// @route   GET /organization/invitations/:token/info
// @access  Public
const getInvitationByToken = async (req, res, next) => {
    try {
        const { token } = req.params;

        const invitation = await TeamInvitation.findOne({
            token,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        }).populate('organizationId', 'name');

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: 'Invitation not found or has expired'
            });
        }

        const userExists = !!(await User.findOne({ email: invitation.invitedEmail }));

        res.json({
            success: true,
            invitation: {
                invitedEmail: invitation.invitedEmail,
                organizationName: invitation.organizationId ? invitation.organizationId.name : 'Unknown',
                expiresAt: invitation.expiresAt,
                userExists
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Complete invite setup — create account for new user
// @route   POST /organization/invitations/:token/setup
// @access  Public
const completeInviteSetup = async (req, res, next) => {
    try {
        const { token } = req.params;

        // Check express-validator results
        const { validationResult } = require('express-validator');
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }

        const { firstName, lastName, phone, password } = req.body;

        if (!firstName || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'First name, phone, and password are required'
            });
        }

        const invitation = await TeamInvitation.findOne({
            token,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: 'Invitation not found or has expired'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: invitation.invitedEmail });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'An account already exists for this email. Please log in instead.'
            });
        }

        // Create new user
        const user = new User({
            firstName: firstName.trim(),
            lastName: (lastName || '').trim(),
            email: invitation.invitedEmail,
            phone: phone.trim(),
            password,
            role: 'ADVOCATE',
            status: 'VERIFIED'
        });
        await user.save();

        // Link invitation to new user
        invitation.invitedUserId = user._id;

        // --- Onboard user into the organization (same logic as acceptInvitation) ---
        const org = await Organization.findById(invitation.organizationId);
        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        // Seat check: active non-admin members vs active seats
        const activeCount = org.members.filter(m => m.status === 'ACTIVE' && m.role !== 'ADMIN').length;
        const availableSeats = org.seats ? org.seats.filter(s => s.status === 'ACTIVE').length : 0;
        if (activeCount >= availableSeats) {
            return res.status(400).json({ success: false, message: 'No seats available in this organization' });
        }

        // Add user to org members
        org.members.push({
            userId: user._id,
            role: 'ADVOCATE',
            status: 'ACTIVE',
            joinedAt: new Date()
        });

        // Assign the seat purchased for this invite
        if (invitation.seatId) {
            const seat = org.seats.id(invitation.seatId);
            if (seat && seat.status === 'ACTIVE') {
                seat.assignedTo = user._id;
            }
        }

        await org.save();

        // Update user with org membership and plan
        user.organizationId = org._id;
        if (invitation.seatPlan) {
            user.subscriptionPlan = invitation.seatPlan;
            user.subscriptionStatus = 'ACTIVE';
            user.subscriptionExpiresAt = org.subscriptionExpiresAt;
        }

        // Mark invitation as accepted
        invitation.status = 'accepted';
        invitation.acceptedAt = new Date();
        await invitation.save();

        // Generate JWT
        const sessionToken = crypto.randomUUID();
        const jwtToken = generateToken(user._id, sessionToken);

        // Save session token on user
        user.sessionToken = sessionToken;
        await user.save();

        res.status(201).json({
            success: true,
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            organizationId: org._id,
            subscriptionStatus: user.subscriptionStatus || 'INACTIVE',
            token: jwtToken
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getOrganization,
    getMembers,
    inviteMember,
    getInvitations,
    acceptInvitation,
    rejectInvitation,
    removeMember,
    reassignCases,
    updateSeats,
    getPublicOrganizations,
    revokeInvitation,
    getMyInvitations,
    getInvitationByToken,
    completeInviteSetup
};
