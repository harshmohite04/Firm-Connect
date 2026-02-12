const Organization = require('../models/Organization');
const User = require('../models/User');
const Case = require('../models/Case');
const TeamInvitation = require('../models/TeamInvitation');
const sendEmail = require('../utils/emailService');
const teamInvitationTemplate = require('../utils/teamInvitationTemplate');
const crypto = require('crypto');

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
    try {
        const { email } = req.body;
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

        // Check seat availability
        const activeCount = org.members.filter(m => m.status === 'ACTIVE').length;
        if (activeCount >= org.maxSeats) {
            res.status(400);
            throw new Error(`No seats available. Your plan allows ${org.maxSeats} seats.`);
        }

        // Find or create the user
        let userToInvite = await User.findOne({ email: email.toLowerCase() });
        let generatedPassword = null;

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
            // === AUTO-CREATE USER with generated password ===
            generatedPassword = crypto.randomBytes(4).toString('hex'); // 8-char password
            userToInvite = await User.create({
                firstName: email.split('@')[0], // Use email prefix as name
                lastName: 'Member',
                email: email.toLowerCase(),
                password: generatedPassword,
                role: 'ATTORNEY',
                status: 'VERIFIED' // Auto-verified since admin is adding them
            });
        }

        // Directly add user to organization (skip link-based flow)
        userToInvite.organizationId = org._id;
        userToInvite.role = 'ATTORNEY';
        await userToInvite.save();

        // Check if this user was previously removed — reactivate instead of adding duplicate
        const existingEntry = org.members.find(
            m => m.userId && m.userId.toString() === userToInvite._id.toString()
        );
        if (existingEntry) {
            existingEntry.status = 'ACTIVE';
            existingEntry.removedAt = null;
            existingEntry.joinedAt = new Date();
        } else {
            org.members.push({
                userId: userToInvite._id,
                role: 'ATTORNEY',
                status: 'ACTIVE',
                joinedAt: new Date()
            });
        }
        await org.save();

        // Log credentials to console for testing
        console.log('\n========================================');
        console.log('👤 MEMBER ADDED TO ORGANIZATION');
        console.log(`   Email: ${email.toLowerCase()}`);
        console.log(`   Org:   ${org.name}`);
        if (generatedPassword) {
            console.log(`   🔑 Password: ${generatedPassword}  (new account created)`);
        } else {
            console.log(`   ℹ️  Existing user — use their current password`);
        }
        console.log('========================================\n');

        res.status(201).json({
            success: true,
            message: generatedPassword
                ? `Account created and added to ${org.name}`
                : `Existing user added to ${org.name}`,
            member: {
                email: userToInvite.email,
                firstName: userToInvite.firstName,
                lastName: userToInvite.lastName,
            },
            // Only include in test mode
            _testPassword: generatedPassword || '(existing user — use their password)'
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

        // Check seat availability
        const activeCount = org.members.filter(m => m.status === 'ACTIVE').length;
        if (activeCount >= org.maxSeats) {
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
            role: 'ATTORNEY',
            status: 'ACTIVE',
            joinedAt: new Date()
        });
        await org.save();

        // Update user
        acceptingUser.organizationId = org._id;
        acceptingUser.role = 'ATTORNEY';
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
        const memberEntry = org.members.find(
            m => m.userId.toString() === userId && m.status === 'ACTIVE'
        );

        if (!memberEntry) {
            res.status(404);
            throw new Error('Member not found in organization');
        }

        // Soft remove — set status to REMOVED, keep data intact
        memberEntry.status = 'REMOVED';
        memberEntry.removedAt = new Date();
        await org.save();

        // Remove org reference from user (they lose portal access)
        const removedUser = await User.findById(userId);
        if (removedUser) {
            removedUser.organizationId = null;
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

        // Verify toUser is an active member (or the admin themselves)
        const toUser = await User.findById(toUserId);
        if (!toUser) {
            res.status(404);
            throw new Error('Target user not found');
        }

        // Allow reassigning to admin themselves or active org members
        const isActiveMember = org.members.some(
            m => m.userId.toString() === toUserId && m.status === 'ACTIVE'
        );
        if (!isActiveMember) {
            res.status(400);
            throw new Error('Target user must be an active member of the organization');
        }

        // Reassign the cases
        let reassignedCount = 0;
        for (const caseId of caseIds) {
            const caseDoc = await Case.findOne({
                _id: caseId,
                organizationId: org._id,
                recordStatus: 1
            });

            if (!caseDoc) continue;

            // Update lead attorney if it was the removed user
            if (caseDoc.leadAttorneyId && caseDoc.leadAttorneyId.toString() === fromUserId) {
                caseDoc.leadAttorneyId = toUserId;
            }

            // Update createdBy if it was the removed user
            if (caseDoc.createdBy.toString() === fromUserId) {
                caseDoc.createdBy = toUserId;
            }

            // Replace in assignedLawyers
            caseDoc.assignedLawyers = caseDoc.assignedLawyers.map(
                id => id.toString() === fromUserId ? toUserId : id
            );

            // Replace in teamMembers
            caseDoc.teamMembers = caseDoc.teamMembers.map(member => {
                if (member.userId.toString() === fromUserId) {
                    return { ...member.toObject(), userId: toUserId };
                }
                return member;
            });

            // Add activity log
            caseDoc.activityLog.push({
                type: 'case_reassigned',
                description: `Case reassigned from removed member to ${toUser.firstName} ${toUser.lastName}`,
                performedBy: req.user._id
            });

            await caseDoc.save();
            reassignedCount++;
        }

        res.json({
            success: true,
            message: `${reassignedCount} case(s) reassigned successfully`,
            reassignedCount
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update (increase) seat count for the organization
// @route   PATCH /organization/seats
// @access  Private (Admin only)
const updateSeats = async (req, res, next) => {
    try {
        const { additionalSeats, paymentId } = req.body;
        const admin = await User.findById(req.user._id);

        if (admin.role !== 'ADMIN') {
            res.status(403);
            throw new Error('Only admins can update seats');
        }

        if (!admin.organizationId) {
            res.status(400);
            throw new Error('No organization found');
        }

        const count = parseInt(additionalSeats, 10);
        if (!count || count < 1 || count > 50) {
            res.status(400);
            throw new Error('Additional seats must be between 1 and 50');
        }

        const org = await Organization.findById(admin.organizationId);
        if (!org) {
            res.status(404);
            throw new Error('Organization not found');
        }

        const newMax = org.maxSeats + count;
        if (newMax > 50) {
            res.status(400);
            throw new Error(`Cannot exceed 50 seats. Current: ${org.maxSeats}, max you can add: ${50 - org.maxSeats}`);
        }

        // ===== PAYMENT VERIFICATION — Enable when Razorpay is active =====
        // Per-seat pricing (monthly):
        //   STARTER plan:       ₹299/seat/month
        //   PROFESSIONAL plan:  ₹499/seat/month
        //
        // const pricePerSeat = org.plan === 'STARTER' ? 29900 : 49900; // paise
        // const expectedAmount = pricePerSeat * count;
        //
        // if (!paymentId) {
        //     res.status(400);
        //     throw new Error('Payment is required to add seats');
        // }
        //
        // // Verify Razorpay payment
        // const payment = await razorpay.payments.fetch(paymentId);
        // if (payment.status !== 'captured' || payment.amount < expectedAmount) {
        //     res.status(400);
        //     throw new Error('Payment verification failed');
        // }
        // ===== END PAYMENT VERIFICATION =====

        // [TEST MODE] — directly increase seats without payment
        console.log(`[SEATS][TEST] Skipping payment — in production, ₹${org.plan === 'STARTER' ? 299 : 499}/seat/month * ${count} seats required`);

        org.maxSeats = newMax;
        await org.save();

        console.log(`[SEATS] ${admin.email} increased seats to ${newMax} for org ${org.name}`);

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

module.exports = {
    getOrganization,
    getMembers,
    inviteMember,
    getInvitations,
    acceptInvitation,
    rejectInvitation,
    removeMember,
    reassignCases,
    updateSeats
};
