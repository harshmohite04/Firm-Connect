const Organization = require('../models/Organization');
const razorpay = require('../utils/razorpayConfig');
const User = require('../models/User');
const Case = require('../models/Case');
const TeamInvitation = require('../models/TeamInvitation');
const CaseTeamRequest = require('../models/CaseTeamRequest');
const sendEmail = require('../utils/emailService');
const teamInvitationTemplate = require('../utils/teamInvitationTemplate');
const caseTeamAddedTemplate = require('../utils/caseTeamAddedTemplate');
const { organizationInvitationTemplate, organizationExistingUserTemplate, organizationInvitationSetupTemplate } = require('../utils/organizationInvitationTemplate');
const crypto = require('crypto');
const generateToken = require('../utils/generateToken');
const OrgActivityLog = require('../models/OrgActivityLog');
const createNotification = require('../utils/createNotification');

const logOrgActivity = async (organizationId, action, actorId, targetId = null, metadata = {}) => {
    try {
        await OrgActivityLog.create({ organizationId, action, actorId, targetId, metadata });
    } catch (err) {
        console.error('Failed to log org activity:', err);
    }
};

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
                    subject: `Welcome to ${org.name} on LawFirmAI`,
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

        await logOrgActivity(org._id, 'INVITE_SENT', admin._id, null, { email: normalizedEmail });

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

        await logOrgActivity(org._id, 'INVITE_ACCEPTED', acceptingUser._id);
        await logOrgActivity(org._id, 'MEMBER_JOINED', acceptingUser._id);

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

        await logOrgActivity(invitation.organizationId, 'INVITE_DECLINED', req.user?._id || null);

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

        await logOrgActivity(org._id, 'MEMBER_REMOVED', req.user._id, userId);

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

        // Mark invitation as revoked (member was never added to org, so no cleanup needed)
        invitation.status = 'revoked';
        await invitation.save();

        await logOrgActivity(admin.organizationId, 'INVITE_REVOKED', admin._id, null, { email: invitation.invitedEmail });

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

        await logOrgActivity(org._id, 'INVITE_ACCEPTED', user._id);
        await logOrgActivity(org._id, 'MEMBER_JOINED', user._id);

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

// @desc    Leave the organization (advocate only)
// @route   POST /organization/leave
// @access  Private (Advocate only)
const leaveOrganization = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (user.role === 'ADMIN') {
            res.status(403);
            throw new Error('Admins cannot leave their own organization. Delete the organization instead.');
        }

        if (!user.organizationId) {
            res.status(400);
            throw new Error('You are not part of any organization');
        }

        const org = await Organization.findById(user.organizationId);
        if (!org) {
            res.status(404);
            throw new Error('Organization not found');
        }

        // Check for active cases
        const activeCases = await Case.find({
            organizationId: org._id,
            recordStatus: 1,
            $or: [
                { createdBy: user._id },
                { leadAttorneyId: user._id },
                { assignedLawyers: user._id }
            ]
        }).select('_id title status');

        if (activeCases.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You have active cases that must be reassigned before leaving.',
                activeCases
            });
        }

        // Soft remove member
        const memberIndex = org.members.findIndex(
            m => m.userId.toString() === user._id.toString() && m.status === 'ACTIVE'
        );
        if (memberIndex !== -1) {
            org.members[memberIndex].status = 'REMOVED';
            org.members[memberIndex].removedAt = new Date();
        }

        // Clear seat assignment
        const assignedSeat = org.seats
            ? org.seats.find(s => s.assignedTo && s.assignedTo.toString() === user._id.toString())
            : null;
        if (assignedSeat) {
            assignedSeat.assignedTo = null;
        }

        await org.save();

        // Clear user org reference
        user.organizationId = null;
        user.subscriptionStatus = 'INACTIVE';
        user.subscriptionPlan = undefined;
        user.subscriptionExpiresAt = undefined;
        await user.save();

        await logOrgActivity(org._id, 'MEMBER_LEFT', user._id);

        res.json({ success: true, message: 'You have left the organization' });
    } catch (error) {
        next(error);
    }
};

// @desc    Update organization details
// @route   PATCH /organization
// @access  Private (Admin only)
const updateOrganization = async (req, res, next) => {
    try {
        const admin = await User.findById(req.user._id);

        if (admin.role !== 'ADMIN') {
            res.status(403);
            throw new Error('Only admins can update the organization');
        }

        if (!admin.organizationId) {
            res.status(400);
            throw new Error('No organization found');
        }

        const org = await Organization.findById(admin.organizationId);
        if (!org) {
            res.status(404);
            throw new Error('Organization not found');
        }

        const { name, description } = req.body;
        const oldValues = {};
        const newValues = {};

        if (name !== undefined && name.trim() !== org.name) {
            oldValues.name = org.name;
            org.name = name.trim();
            newValues.name = org.name;
        }

        if (description !== undefined && description.trim() !== org.description) {
            oldValues.description = org.description;
            org.description = description.trim();
            newValues.description = org.description;
        }

        if (Object.keys(newValues).length === 0) {
            return res.json({ success: true, message: 'No changes made', organization: org });
        }

        await org.save();
        await logOrgActivity(org._id, 'ORG_UPDATED', admin._id, null, { oldValues, newValues });

        res.json({ success: true, message: 'Organization updated', organization: org });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete organization
// @route   DELETE /organization
// @access  Private (Admin only)
const deleteOrganization = async (req, res, next) => {
    try {
        const admin = await User.findById(req.user._id);

        if (admin.role !== 'ADMIN') {
            res.status(403);
            throw new Error('Only admins can delete the organization');
        }

        if (!admin.organizationId) {
            res.status(400);
            throw new Error('No organization found');
        }

        const org = await Organization.findById(admin.organizationId);
        if (!org) {
            res.status(404);
            throw new Error('Organization not found');
        }

        // Check for active cases
        const activeCases = await Case.find({
            organizationId: org._id,
            recordStatus: 1
        }).select('_id');

        if (activeCases.length > 0) {
            res.status(400);
            throw new Error(`Cannot delete organization with ${activeCases.length} active case(s). Close or delete all cases first.`);
        }

        // Cancel all active Razorpay seat subscriptions
        for (const seat of org.seats) {
            if (seat.status === 'ACTIVE' && seat.razorpaySubscriptionId) {
                try {
                    await razorpay.subscriptions.cancel(seat.razorpaySubscriptionId);
                } catch (rzpErr) {
                    console.error('Failed to cancel seat subscription:', rzpErr);
                }
            }
        }

        // Clear org reference from all active members
        const activeMembers = org.members.filter(m => m.status === 'ACTIVE');
        for (const member of activeMembers) {
            const memberUser = await User.findById(member.userId);
            if (memberUser) {
                memberUser.organizationId = null;
                memberUser.subscriptionStatus = 'INACTIVE';
                memberUser.subscriptionPlan = undefined;
                memberUser.subscriptionExpiresAt = undefined;
                if (memberUser.role === 'ADMIN') {
                    memberUser.role = 'ADVOCATE';
                }
                await memberUser.save();
            }
        }

        // Delete pending invitations
        await TeamInvitation.deleteMany({ organizationId: org._id, status: 'pending' });

        await logOrgActivity(org._id, 'ORG_DELETED', admin._id, null, { orgName: org.name });

        // Delete activity logs and the org
        await OrgActivityLog.deleteMany({ organizationId: org._id });
        await Organization.findByIdAndDelete(org._id);

        res.json({ success: true, message: 'Organization deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get organization activity log
// @route   GET /organization/activity-log
// @access  Private (Admin only)
const getActivityLog = async (req, res, next) => {
    try {
        const admin = await User.findById(req.user._id);

        if (admin.role !== 'ADMIN') {
            res.status(403);
            throw new Error('Only admins can view activity logs');
        }

        if (!admin.organizationId) {
            res.status(400);
            throw new Error('No organization found');
        }

        const { type, limit = 50, page = 1 } = req.query;
        const query = { organizationId: admin.organizationId };
        if (type) {
            query.action = type;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await OrgActivityLog.countDocuments(query);

        const logs = await OrgActivityLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('actorId', 'firstName lastName email')
            .populate('targetId', 'firstName lastName email');

        res.json({
            success: true,
            logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get invitation history (non-pending)
// @route   GET /organization/invitation-history
// @access  Private (Admin only)
const getInvitationHistory = async (req, res, next) => {
    try {
        const admin = await User.findById(req.user._id);

        if (admin.role !== 'ADMIN') {
            res.status(403);
            throw new Error('Only admins can view invitation history');
        }

        if (!admin.organizationId) {
            res.status(400);
            throw new Error('No organization found');
        }

        const invitations = await TeamInvitation.find({
            organizationId: admin.organizationId,
            $or: [
                { status: { $in: ['accepted', 'rejected', 'revoked'] } },
                { status: 'pending', expiresAt: { $lte: new Date() } }
            ]
        }).sort({ createdAt: -1 });

        // Mark expired pending invitations
        const history = invitations.map(inv => {
            const obj = inv.toObject();
            if (obj.status === 'pending' && new Date(obj.expiresAt) <= new Date()) {
                obj.status = 'expired';
            }
            return obj;
        });

        res.json({ success: true, invitations: history });
    } catch (error) {
        next(error);
    }
};

// @desc    Get a single case team request by ID
// @route   GET /organization/case-team-requests/:requestId
// @access  Private (Org Admin)
const getCaseTeamRequestById = async (req, res, next) => {
    try {
        const admin = await User.findById(req.user._id);
        if (admin.role !== 'ADMIN') {
            res.status(403);
            throw new Error('Only admins can view case team requests');
        }

        const request = await CaseTeamRequest.findById(req.params.requestId)
            .populate('caseId', 'title legalMatter status')
            .populate('requestedUserId', 'firstName lastName email')
            .populate('requestedByUserId', 'firstName lastName email');

        if (!request) {
            res.status(404);
            throw new Error('Case team request not found');
        }

        // Verify request belongs to admin's org
        if (request.organizationId.toString() !== admin.organizationId.toString()) {
            res.status(403);
            throw new Error('This request does not belong to your organization');
        }

        res.json({
            success: true,
            request: {
                _id: request._id,
                status: request.status,
                role: request.role,
                reason: request.reason,
                createdAt: request.createdAt,
                case: request.caseId ? {
                    _id: request.caseId._id,
                    title: request.caseId.title,
                    legalMatter: request.caseId.legalMatter,
                    status: request.caseId.status
                } : null,
                requestedUser: request.requestedUserId ? {
                    _id: request.requestedUserId._id,
                    firstName: request.requestedUserId.firstName,
                    lastName: request.requestedUserId.lastName,
                    email: request.requestedUserId.email
                } : null,
                requestedBy: request.requestedByUserId ? {
                    _id: request.requestedByUserId._id,
                    firstName: request.requestedByUserId.firstName,
                    lastName: request.requestedByUserId.lastName,
                    email: request.requestedByUserId.email
                } : null
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve or reject a case team request
// @route   PATCH /organization/case-team-requests/:requestId
// @access  Private (Org Admin)
const reviewCaseTeamRequest = async (req, res, next) => {
    try {
        const admin = await User.findById(req.user._id);
        if (admin.role !== 'ADMIN') {
            res.status(403);
            throw new Error('Only admins can review case team requests');
        }

        const { action, reason } = req.body;
        if (!['approve', 'reject'].includes(action)) {
            res.status(400);
            throw new Error('Action must be "approve" or "reject"');
        }

        const request = await CaseTeamRequest.findById(req.params.requestId);
        if (!request) {
            res.status(404);
            throw new Error('Case team request not found');
        }

        if (request.organizationId.toString() !== admin.organizationId.toString()) {
            res.status(403);
            throw new Error('This request does not belong to your organization');
        }

        if (request.status !== 'pending') {
            res.status(400);
            throw new Error('This request has already been reviewed');
        }

        const io = req.app.get('socketio');

        if (action === 'approve') {
            // Update request
            request.status = 'approved';
            request.reviewedBy = admin._id;
            request.reviewedAt = new Date();
            await request.save();

            // Add user to case
            const caseDoc = await Case.findById(request.caseId);
            const userToAdd = await User.findById(request.requestedUserId);

            if (caseDoc && userToAdd) {
                const memberRole = request.role || 'MEMBER';
                caseDoc.teamMembers.push({
                    userId: userToAdd._id,
                    role: memberRole,
                    joinedAt: new Date()
                });
                // Skip assignedLawyers for VIEWER role
                if (memberRole !== 'VIEWER' &&
                    !caseDoc.assignedLawyers.some(id => id.toString() === userToAdd._id.toString())) {
                    caseDoc.assignedLawyers.push(userToAdd._id);
                }
                await caseDoc.save();

                // Send email to advocate
                const frontendUrl = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',')[0].trim();
                const viewCaseLink = `${frontendUrl}/portal/cases/${caseDoc._id}`;
                const requester = await User.findById(request.requestedByUserId);
                const adderName = requester ? `${requester.firstName} ${requester.lastName || ''}`.trim() : 'A team member';

                const emailHtml = caseTeamAddedTemplate(
                    adderName,
                    caseDoc.title,
                    caseDoc.legalMatter,
                    viewCaseLink
                );
                sendEmail({
                    email: userToAdd.email,
                    subject: `You've been added to case "${caseDoc.title}" - LawFirmAI`,
                    html: emailHtml
                }).catch(err => console.error('Failed to send case team email:', err));

                // Notify advocate
                await createNotification(io, {
                    recipient: userToAdd._id,
                    type: 'case',
                    title: 'Added to Case Team',
                    description: `You've been added to the team for "${caseDoc.title}"`,
                    link: `/portal/cases/${caseDoc._id}`,
                    metadata: { caseId: caseDoc._id }
                });

                // Notify lead attorney
                await createNotification(io, {
                    recipient: request.requestedByUserId,
                    type: 'case',
                    title: 'Team Request Approved',
                    description: `Your request to add ${userToAdd.firstName} ${userToAdd.lastName} to "${caseDoc.title}" was approved`,
                    link: `/portal/cases/${caseDoc._id}`,
                    metadata: { caseId: caseDoc._id }
                });
            }

            res.json({ success: true, message: 'Request approved. Advocate has been added to the case.' });
        } else {
            // Reject
            request.status = 'rejected';
            request.reviewedBy = admin._id;
            request.reviewedAt = new Date();
            request.reason = reason || '';
            await request.save();

            // Notify lead attorney
            const caseDoc = await Case.findById(request.caseId);
            const userToAdd = await User.findById(request.requestedUserId);
            const caseName = caseDoc ? caseDoc.title : 'a case';
            const userName = userToAdd ? `${userToAdd.firstName} ${userToAdd.lastName}` : 'the advocate';

            await createNotification(io, {
                recipient: request.requestedByUserId,
                type: 'case',
                title: 'Team Request Rejected',
                description: `Your request to add ${userName} to "${caseName}" was rejected${reason ? ': ' + reason : ''}`,
                link: caseDoc ? `/portal/cases/${caseDoc._id}` : null,
                metadata: { caseId: request.caseId }
            });

            res.json({ success: true, message: 'Request rejected.' });
        }
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
    completeInviteSetup,
    leaveOrganization,
    updateOrganization,
    deleteOrganization,
    getActivityLog,
    getInvitationHistory,
    getCaseTeamRequestById,
    reviewCaseTeamRequest
};
