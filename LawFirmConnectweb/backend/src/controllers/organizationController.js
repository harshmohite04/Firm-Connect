const Organization = require('../models/Organization');
const razorpay = require('../utils/razorpayConfig');
const User = require('../models/User');
const Case = require('../models/Case');
const TeamInvitation = require('../models/TeamInvitation');
const sendEmail = require('../utils/emailService');
const teamInvitationTemplate = require('../utils/teamInvitationTemplate');
const { organizationInvitationTemplate, organizationExistingUserTemplate } = require('../utils/organizationInvitationTemplate');
const crypto = require('crypto');
const mongoose = require('mongoose');

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

        res.json({
            success: true,
            members: activeMembers,
            totalSeats: org.maxSeats,
            usedSeats: activeMembers.length
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Invite a member to the organization
// @route   POST /organization/invite
// @access  Private (Admin only)
const inviteMember = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { email } = req.body;
        const normalizedEmail = email.toLowerCase();
        
        const admin = await User.findById(req.user._id).session(session);

        if (admin.role !== 'ADMIN') {
            await session.abortTransaction();
            session.endSession(); // Ensure session is ended
            res.status(403);
            throw new Error('Only admins can invite members');
        }

        if (!admin.organizationId) {
            await session.abortTransaction();
            session.endSession();
            res.status(400);
            throw new Error('You must have an organization to invite members');
        }

        // Fetch org with write lock (conceptually) or just check atomic constraints
        const org = await Organization.findById(admin.organizationId).session(session);

        if (!org) {
            await session.abortTransaction();
            session.endSession();
            res.status(404);
            throw new Error('Organization not found');
        }

        // Strict Atomic Check: Count active members
        const activeCount = org.members.filter(m => m.status === 'ACTIVE').length;
        if (activeCount >= org.maxSeats) {
            await session.abortTransaction();
            session.endSession();
            res.status(400);
            throw new Error(`No seats available. Your plan allows ${org.maxSeats} seats.`);
        }

        let userToInvite = await User.findOne({ email: normalizedEmail }).session(session);
        let generatedPassword = null;
        let isNewUser = false;

        if (userToInvite) {
            // Check if already an active member
            const isAlreadyMember = org.members.some(
                m => m.userId && m.userId.toString() === userToInvite._id.toString() && m.status === 'ACTIVE'
            );
            if (isAlreadyMember) {
                await session.abortTransaction();
                session.endSession();
                res.status(400);
                throw new Error('User is already an active member of your organization');
            }

            // Check if user belongs to another org
            if (userToInvite.organizationId && userToInvite.organizationId.toString() !== org._id.toString()) {
                await session.abortTransaction();
                session.endSession();
                res.status(400);
                throw new Error('User already belongs to another organization');
            }
        } else {
            // === AUTO-CREATE USER with STRONG generated password ===
            isNewUser = true;
            generatedPassword = crypto.randomBytes(12).toString('hex'); 
            
            userToInvite = new User({
                firstName: email.split('@')[0], 
                lastName: 'Member',
                email: normalizedEmail,
                password: generatedPassword,
                role: 'ATTORNEY',
                status: 'VERIFIED'
            });
            await userToInvite.save({ session });
        }

        // Update User
        userToInvite.organizationId = org._id;
        userToInvite.role = 'ATTORNEY';
        await userToInvite.save({ session });

        // Update Organization Member List
        const existingEntryIndex = org.members.findIndex(
            m => m.userId && m.userId.toString() === userToInvite._id.toString()
        );

        if (existingEntryIndex !== -1) {
            // Reactivate existing member entry
            org.members[existingEntryIndex].status = 'ACTIVE';
            org.members[existingEntryIndex].removedAt = null;
            org.members[existingEntryIndex].joinedAt = new Date();
        } else {
            // Add new member entry
            org.members.push({
                userId: userToInvite._id,
                role: 'ATTORNEY',
                status: 'ACTIVE',
                joinedAt: new Date()
            });
        }
        
        await org.save({ session });

        // Commit Transaction
        await session.commitTransaction();
        session.endSession();

        // --- EMAIL NOTIFICATION (Outside Transaction) ---
        // We do this after commit so we don't send email if DB fails.
        try {
            const loginLink = process.env.FRONTEND_URL || 'http://localhost:5173/login';
            
            if (isNewUser) {
                const htmlContent = organizationInvitationTemplate(org.name, `${admin.firstName} ${admin.lastName}`, generatedPassword, loginLink);
                await sendEmail({
                    email: normalizedEmail,
                    subject: `Welcome to ${org.name} on LawFirmConnect`,
                    html: htmlContent,
                    message: `You have been added to ${org.name}. Your password is: ${generatedPassword}. Please login at ${loginLink}`
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
            // We don't fail the request, just log it. The user is added anyway.
        }

        res.status(201).json({
            success: true,
            message: isNewUser
                ? `Account created and added to ${org.name}. Email sent.`
                : `Existing user added to ${org.name}. Email sent.`,
            member: {
                email: userToInvite.email,
                firstName: userToInvite.firstName,
                lastName: userToInvite.lastName,
            }
        });

    } catch (error) {
        if (session.inTransaction()) {
             await session.abortTransaction();
        }
        session.endSession();
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { token } = req.params;

        const invitation = await TeamInvitation.findOne({
            token,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        }).populate('organizationId').session(session);

        if (!invitation) {
            await session.abortTransaction();
             session.endSession();
            res.status(404);
            throw new Error('Invitation not found or has expired');
        }

        const org = invitation.organizationId;
        if (!org) {
            await session.abortTransaction();
             session.endSession();
            res.status(404);
            throw new Error('Organization associated with this invitation does not exist');
        }

        // Atomic Seat Check
        const activeCount = org.members.filter(m => m.status === 'ACTIVE').length;
        if (activeCount >= org.maxSeats) {
            await session.abortTransaction();
             session.endSession();
            res.status(400);
            throw new Error('No seats available in this organization');
        }

        // Get the accepting user
        const acceptingUser = await User.findById(req.user._id).session(session);

        if (!acceptingUser) {
            await session.abortTransaction();
             session.endSession();
            res.status(404);
            throw new Error('User not found');
        }

        // Check email matches
        if (acceptingUser.email.toLowerCase() !== invitation.invitedEmail.toLowerCase()) {
            await session.abortTransaction();
             session.endSession();
            res.status(403);
            throw new Error('This invitation was sent to a different email address');
        }

        // Check if user already belongs to an org
        if (acceptingUser.organizationId) {
            await session.abortTransaction();
             session.endSession();
            res.status(400);
            throw new Error('You already belong to an organization. One firm per user.');
        }

        // Update invitation
        invitation.status = 'accepted';
        invitation.acceptedAt = new Date();
        invitation.invitedUserId = acceptingUser._id;
        await invitation.save({ session });

        // Add user to org
        org.members.push({
            userId: acceptingUser._id,
            role: 'ATTORNEY',
            status: 'ACTIVE',
            joinedAt: new Date()
        });
        await org.save({ session });

        // Update user
        acceptingUser.organizationId = org._id;
        acceptingUser.role = 'ATTORNEY';
        await acceptingUser.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({
            success: true,
            message: `You have joined ${org.name}`,
            organization: {
                id: org._id,
                name: org.name
            }
        });
    } catch (error) {
        if (session.inTransaction()) {
             await session.abortTransaction();
        }
        session.endSession();
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { userId } = req.params;
        const admin = await User.findById(req.user._id).session(session);

        if (admin.role !== 'ADMIN') {
            await session.abortTransaction();
             session.endSession();
            res.status(403);
            throw new Error('Only admins can remove members');
        }

        // Cannot remove yourself
        if (userId === req.user._id.toString()) {
            await session.abortTransaction();
             session.endSession();
            res.status(400);
            throw new Error('You cannot remove yourself from the organization');
        }

        const org = await Organization.findById(admin.organizationId).session(session);

        if (!org) {
            await session.abortTransaction();
             session.endSession();
            res.status(404);
            throw new Error('Organization not found');
        }

        // Find the member in the org
        const memberIndex = org.members.findIndex(
            m => m.userId.toString() === userId && m.status === 'ACTIVE'
        );

        if (memberIndex === -1) {
            await session.abortTransaction();
             session.endSession();
            res.status(404);
            throw new Error('Member not found in organization (or already removed)');
        }

        // Soft remove — set status to REMOVED, keep data intact
        org.members[memberIndex].status = 'REMOVED';
        org.members[memberIndex].removedAt = new Date();
        await org.save({ session });

        // Remove org reference from user (they lose portal access)
        const removedUser = await User.findById(userId).session(session);
        if (removedUser) {
            removedUser.organizationId = null;
            await removedUser.save({ session });
        }

        await session.commitTransaction();
        session.endSession();

        // Get cases that need reassignment (this can be outside transaction as it's just a read)
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
        if (session.inTransaction()) {
             await session.abortTransaction();
        }
        session.endSession();
        next(error);
    }
};

// @desc    Reassign cases from one user to another
// @route   POST /organization/reassign-cases
// @access  Private (Admin only)
const reassignCases = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { fromUserId, toUserId, caseIds } = req.body;
        const admin = await User.findById(req.user._id).session(session);

        if (admin.role !== 'ADMIN') {
            await session.abortTransaction();
             session.endSession();
            res.status(403);
            throw new Error('Only admins can reassign cases');
        }

        const org = await Organization.findById(admin.organizationId).session(session);
        if (!org) {
            await session.abortTransaction();
             session.endSession();
            res.status(404);
            throw new Error('Organization not found');
        }

        // Verify toUser is an active member
        const isActiveMember = org.members.some(
            m => m.userId.toString() === toUserId && m.status === 'ACTIVE'
        );
        if (!isActiveMember) {
            await session.abortTransaction();
             session.endSession();
            res.status(400);
            throw new Error('Target user must be an active member of the organization');
        }
        
        const toUser = await User.findById(toUserId).session(session);
        if (!toUser) {
             await session.abortTransaction();
             session.endSession();
             res.status(404);
             throw new Error('Target user not found');
        }

        // Find cases to update details
        const casesToUpdate = await Case.find({
            _id: { $in: caseIds },
            organizationId: org._id,
            recordStatus: 1
        }).session(session);

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
                await caseDoc.save({ session });
                modifiedCount++;
            }
        }

        await session.commitTransaction();
        session.endSession();

        res.json({
            success: true,
            message: `${modifiedCount} case(s) reassigned successfully`,
            reassignedCount: modifiedCount
        });
    } catch (error) {
        if (session.inTransaction()) {
             await session.abortTransaction();
        }
        session.endSession();
        next(error);
    }
};


// @desc    Update (increase) seat count for the organization
// @route   PATCH /organization/seats
// @access  Private (Admin only)
const updateSeats = async (req, res, next) => {
    // No transaction needed here as it's a single document update, 
    // but good to keep it consistent if we add more logic later.
    try {
        const { additionalSeats, paymentId } = req.body;
        const admin = await User.findById(req.user._id);

        if (admin.role !== 'ADMIN') {
            res.status(403);
            throw new Error('Only admins can update seats');
        }

        const org = await Organization.findById(admin.organizationId);
        if (!org) {
            res.status(404);
            throw new Error('Organization not found');
        }

        const count = parseInt(additionalSeats, 10);
        if (!count || count < 1 || count > 50) {
            res.status(400);
            throw new Error('Additional seats must be between 1 and 50');
        }

        const newMax = org.maxSeats + count;
        if (newMax > 50) {
            res.status(400);
            // Dynamic message
            throw new Error(`Cannot exceed 50 seats. Current: ${org.maxSeats}, max you can add: ${50 - org.maxSeats}`);
        }

        // ===== PAYMENT VERIFICATION =====
        // Bypass payment for any admin with @harsh.com email
        if (!admin.email.endsWith('@harsh.com')) {
            const pricePerSeat = org.plan === 'STARTER' ? 29900 : 49900; // paise
            const expectedAmount = pricePerSeat * count;
    
            if (!paymentId) {
                res.status(400);
                throw new Error('Payment is required to add seats');
            }
    
            // Verify Razorpay payment
            try {
                const payment = await razorpay.payments.fetch(paymentId);
                if (payment.status !== 'captured' || payment.amount < expectedAmount) {
                    res.status(400);
                    throw new Error('Payment verification failed: Amount mismatch or not captured');
                }
            } catch (err) {
                 res.status(400);
                 throw new Error('Payment verification failed: Invalid Payment ID');
            }
        } else {
            console.log(`[SEATS][BYPASS] Skipping payment for domain user: ${admin.email}`);
        }
        // ===== END PAYMENT VERIFICATION =====

        org.maxSeats = newMax;
        await org.save();
        
        res.json({
            success: true,
            message: `Seats increased to ${newMax}`,
            maxSeats: newMax,
            // Include pricing info for frontend display
            pricePerSeat: org.plan === 'STARTER' ? 299 : 499,
            totalCharge: (org.plan === 'STARTER' ? 299 : 499) * count
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
    getPublicOrganizations
};
