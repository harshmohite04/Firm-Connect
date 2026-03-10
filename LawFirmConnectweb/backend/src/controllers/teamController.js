const Case = require('../models/Case');
const User = require('../models/User');
const Organization = require('../models/Organization');
const CaseTeamInvitation = require('../models/CaseTeamInvitation');
const CaseTeamRequest = require('../models/CaseTeamRequest');
const sendEmail = require('../utils/emailService');
const teamInvitationTemplate = require('../utils/teamInvitationTemplate');
const caseTeamAddedTemplate = require('../utils/caseTeamAddedTemplate');
const createNotification = require('../utils/createNotification');

// @desc    Validate if email belongs to a registered user (no caseId needed)
// @route   POST /team/validate-email
// @access  Private
const validateEmailForInvite = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Cannot add people outside the portal. User must be registered first.'
            });
        }

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot invite yourself'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Validate if email belongs to a registered user (case-scoped, legacy)
// @route   POST /cases/:caseId/team/validate
// @access  Private
const validateTeamMember = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Cannot add people outside the portal. User must be registered first.'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Accept case team invitation
// @route   POST /team/case-invitations/:token/accept
// @access  Private
const acceptCaseTeamInvitation = async (req, res, next) => {
    try {
        const { token } = req.params;

        const invitation = await CaseTeamInvitation.findOne({
            token,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        }).populate('caseId');

        if (!invitation) {
            res.status(404);
            throw new Error('Invitation not found or has expired');
        }

        // Only the invited user can accept
        if (invitation.invitedUserId.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('This invitation was not sent to you');
        }

        // Update invitation status
        invitation.status = 'accepted';
        invitation.acceptedAt = new Date();
        await invitation.save();

        // Add user to case team
        const caseDoc = invitation.caseId;
        const alreadyMember = caseDoc.teamMembers.some(
            m => m.userId.toString() === req.user._id.toString()
        );
        if (!alreadyMember) {
            caseDoc.teamMembers.push({
                userId: invitation.invitedUserId,
                role: invitation.role || 'Member',
                joinedAt: new Date()
            });
        }

        // Add to assignedLawyers if not already there
        if (!caseDoc.assignedLawyers.some(id => id.toString() === req.user._id.toString())) {
            caseDoc.assignedLawyers.push(req.user._id);
        }

        // Add activity log
        caseDoc.activityLog.push({
            type: 'team_member_joined',
            description: `${req.user.firstName} ${req.user.lastName || ''} joined the team`.trim(),
            performedBy: req.user._id,
            createdAt: new Date()
        });

        await caseDoc.save();

        // Notify case creator
        const io = req.app.get('socketio');
        const userName = `${req.user.firstName} ${req.user.lastName || ''}`.trim();
        await createNotification(io, {
            recipient: invitation.invitedBy,
            type: 'case',
            title: 'Team Invitation Accepted',
            description: `${userName} accepted your invitation to join "${caseDoc.title}"`,
            link: `/portal/cases/${caseDoc._id}`,
            metadata: { caseId: caseDoc._id }
        });

        res.json({
            success: true,
            message: 'You have successfully joined the team',
            case: {
                id: caseDoc._id,
                title: caseDoc.title,
                category: caseDoc.legalMatter
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reject case team invitation
// @route   POST /team/case-invitations/:token/reject
// @access  Private
const rejectCaseTeamInvitation = async (req, res, next) => {
    try {
        const { token } = req.params;

        const invitation = await CaseTeamInvitation.findOne({
            token,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        }).populate('caseId');

        if (!invitation) {
            res.status(404);
            throw new Error('Invitation not found or has expired');
        }

        // Only the invited user can reject
        if (invitation.invitedUserId.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('This invitation was not sent to you');
        }

        invitation.status = 'rejected';
        await invitation.save();

        // Notify case creator
        const io = req.app.get('socketio');
        const userName = `${req.user.firstName} ${req.user.lastName || ''}`.trim();
        const caseDoc = invitation.caseId;
        await createNotification(io, {
            recipient: invitation.invitedBy,
            type: 'case',
            title: 'Team Invitation Declined',
            description: `${userName} declined your invitation to join "${caseDoc.title}"`,
            link: `/portal/cases/${caseDoc._id}`,
            metadata: { caseId: caseDoc._id }
        });

        res.json({
            success: true,
            message: 'Invitation declined'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get my pending case team invitations
// @route   GET /team/my-case-invitations
// @access  Private
const getMyCaseTeamInvitations = async (req, res, next) => {
    try {
        const invitations = await CaseTeamInvitation.find({
            invitedUserId: req.user._id,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        })
            .populate('caseId', 'title legalMatter')
            .populate('invitedBy', 'firstName lastName');

        res.json({
            success: true,
            invitations: invitations.map(inv => ({
                id: inv._id,
                token: inv.token,
                status: inv.status,
                expiresAt: inv.expiresAt,
                case: inv.caseId ? {
                    id: inv.caseId._id,
                    title: inv.caseId.title,
                    legalMatter: inv.caseId.legalMatter
                } : null,
                invitedBy: inv.invitedBy ? {
                    firstName: inv.invitedBy.firstName,
                    lastName: inv.invitedBy.lastName
                } : null
            }))
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Remove team member
// @route   DELETE /cases/:caseId/team/members/:userId
// @access  Private (Lead Attorney only)
const removeTeamMember = async (req, res, next) => {
    try {
        const caseId = req.params.id || req.params.caseId;
        const { userId } = req.params;

        const caseDoc = req.caseDoc || await Case.findById(caseId);

        if (!caseDoc) {
            res.status(404);
            throw new Error('Case not found');
        }

        // Check if user is lead attorney
        if (caseDoc.leadAttorneyId.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Only the lead attorney can remove team members');
        }

        // Remove member
        caseDoc.teamMembers = caseDoc.teamMembers.filter(
            member => member.userId.toString() !== userId
        );

        // Also remove from assignedLawyers to revoke case access
        caseDoc.assignedLawyers = caseDoc.assignedLawyers.filter(
            id => id.toString() !== userId
        );

        await caseDoc.save();

        res.json({
            success: true,
            message: 'Team member removed successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Leave team
// @route   POST /cases/:caseId/team/leave
// @access  Private
const leaveTeam = async (req, res, next) => {
    try {
        const { caseId } = req.params;

        const caseDoc = await Case.findById(caseId);

        if (!caseDoc) {
            res.status(404);
            throw new Error('Case not found');
        }

        // Check if user is lead attorney
        if (caseDoc.leadAttorneyId.toString() === req.user._id.toString()) {
            res.status(400);
            throw new Error('Lead attorney cannot leave. Please transfer leadership first.');
        }

        // Check if user is a team member
        const isMember = caseDoc.teamMembers.some(
            member => member.userId.toString() === req.user._id.toString()
        );

        if (!isMember) {
            res.status(400);
            throw new Error('You are not a member of this team');
        }

        // Remove user from team
        caseDoc.teamMembers = caseDoc.teamMembers.filter(
            member => member.userId.toString() !== req.user._id.toString()
        );

        // Also remove from assignedLawyers to revoke case access
        caseDoc.assignedLawyers = caseDoc.assignedLawyers.filter(
            id => id.toString() !== req.user._id.toString()
        );

        await caseDoc.save();

        res.json({
            success: true,
            message: 'You have left the team'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update lead attorney
// @route   PATCH /cases/:caseId/team/lead
// @access  Private (Lead Attorney only)
const updateLeadAttorney = async (req, res, next) => {
    try {
        const { caseId } = req.params;
        const { newLeadId } = req.body;

        const caseDoc = await Case.findById(caseId);

        if (!caseDoc) {
            res.status(404);
            throw new Error('Case not found');
        }

        // Check if user is current lead attorney
        if (caseDoc.leadAttorneyId.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Only the current lead attorney can transfer leadership');
        }

        // Check if new lead is a team member
        const isTeamMember = caseDoc.teamMembers.some(
            member => member.userId.toString() === newLeadId
        );

        if (!isTeamMember) {
            res.status(400);
            throw new Error('New lead attorney must be a team member');
        }

        caseDoc.leadAttorneyId = newLeadId;
        await caseDoc.save();

        res.json({
            success: true,
            message: 'Lead attorney updated successfully',
            newLeadId
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get pending invitations for a case
// @route   GET /cases/:caseId/team/invitations
// @access  Private
const getTeamInvitations = async (req, res, next) => {
    try {
        const { caseId } = req.params;

        const invitations = await CaseTeamInvitation.find({
            caseId,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        }).populate('invitedUserId', 'firstName lastName email');

        res.json({
            success: true,
            invitations: invitations.map(inv => ({
                id: inv._id,
                email: inv.invitedEmail,
                status: inv.status,
                expiresAt: inv.expiresAt,
                invitedUser: inv.invitedUserId ? {
                    firstName: inv.invitedUserId.firstName,
                    lastName: inv.invitedUserId.lastName,
                    email: inv.invitedUserId.email
                } : null
            }))
        });
    } catch (error) {
        next(error);
    }
};

// Helper: directly add user to case team, send email + notification
const directAddToCase = async (caseDoc, userToAdd, role, requester, io) => {
    caseDoc.teamMembers.push({
        userId: userToAdd._id,
        role: role || 'Member',
        joinedAt: new Date()
    });

    if (!caseDoc.assignedLawyers.some(id => id.toString() === userToAdd._id.toString())) {
        caseDoc.assignedLawyers.push(userToAdd._id);
    }

    await caseDoc.save();

    const adderName = `${requester.firstName} ${requester.lastName || ''}`.trim();
    const frontendUrl = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',')[0].trim();
    const viewCaseLink = `${frontendUrl}/portal/cases/${caseDoc._id}`;

    // Send email
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

    // In-app notification
    await createNotification(io, {
        recipient: userToAdd._id,
        type: 'case',
        title: 'Added to Case Team',
        description: `${adderName} added you to the team for "${caseDoc.title}"`,
        link: `/portal/cases/${caseDoc._id}`,
        metadata: { caseId: caseDoc._id }
    });
};

// @desc    Directly add a team member (with plan limits & firm logic)
// @route   POST /cases/:caseId/team/members
// @access  Private (Lead Attorney only)
const addTeamMember = async (req, res, next) => {
    try {
        const caseId = req.params.id || req.params.caseId;
        const { email, role } = req.body;

        // Use caseDoc from verifyCaseAccess middleware if available, else fetch
        let caseDoc = req.caseDoc || await Case.findById(caseId);
        if (!caseDoc) {
            res.status(404);
            throw new Error('Case not found');
        }

        // Check if user is lead attorney
        if (caseDoc.leadAttorneyId.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Only the lead attorney can add team members');
        }

        const userToAdd = await User.findOne({ email: email.toLowerCase() });
        if (!userToAdd) {
            res.status(404);
            throw new Error('User not found. They must be registered on the portal first.');
        }

        // Check if already a member
        const isAlreadyMember = caseDoc.teamMembers.some(
            member => member.userId.toString() === userToAdd._id.toString()
        );
        if (isAlreadyMember) {
            res.status(400);
            throw new Error('User is already a team member');
        }

        const io = req.app.get('socketio');
        const requester = req.user;

        // --- A) Requester has NO organization (non-firm user) ---
        if (!requester.organizationId) {
            const plan = requester.subscriptionPlan;
            let limit;
            if (plan === 'PROFESSIONAL') {
                limit = 5;
            } else {
                // STARTER, FREE_TRIAL, null/undefined
                limit = 2;
            }

            // Count pending invitations toward limit too
            const pendingCount = await CaseTeamInvitation.countDocuments({
                caseId: caseDoc._id,
                status: 'pending',
                expiresAt: { $gt: new Date() }
            });
            // Total count = teamMembers + pending invitations + 1 (lead attorney)
            const currentCount = caseDoc.teamMembers.length + pendingCount + 1;
            if (currentCount >= limit) {
                res.status(400);
                throw new Error(`Maximum ${limit} teammates reached for your ${plan || 'STARTER'} plan (including lead attorney and pending invitations). Upgrade your plan to add more.`);
            }

            // Check for existing pending invitation
            const existingInvitation = await CaseTeamInvitation.findOne({
                caseId: caseDoc._id,
                invitedEmail: userToAdd.email.toLowerCase(),
                status: 'pending',
                expiresAt: { $gt: new Date() }
            });
            if (existingInvitation) {
                res.status(400);
                throw new Error('An invitation has already been sent to this user for this case');
            }

            // Create invitation instead of direct add
            const invitation = await CaseTeamInvitation.create({
                caseId: caseDoc._id,
                invitedBy: requester._id,
                invitedEmail: userToAdd.email.toLowerCase(),
                invitedUserId: userToAdd._id,
                role: role || 'Member'
            });

            // Send email
            const frontendUrl = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',')[0].trim();
            const acceptLink = `${frontendUrl}/team/case-invite/${invitation.token}/accept`;
            const rejectLink = `${frontendUrl}/team/case-invite/${invitation.token}/reject`;
            const inviterName = `${requester.firstName} ${requester.lastName || ''}`.trim();

            const emailHtml = teamInvitationTemplate(
                inviterName,
                caseDoc.title,
                caseDoc.legalMatter,
                acceptLink,
                rejectLink
            );
            sendEmail({
                email: userToAdd.email,
                subject: `Team Invitation: "${caseDoc.title}" - LawFirmAI`,
                html: emailHtml
            }).catch(err => console.error('Failed to send team invitation email:', err));

            // In-app notification
            await createNotification(io, {
                recipient: userToAdd._id,
                type: 'system',
                title: 'Case Team Invitation',
                description: `${inviterName} invited you to join the team for "${caseDoc.title}"`,
                link: `/team/case-invite/${invitation.token}`,
                metadata: {
                    type: 'case_team_invitation',
                    caseId: caseDoc._id,
                    token: invitation.token
                }
            });

            return res.status(201).json({
                success: true,
                action: 'invitation_sent',
                message: 'Invitation sent to user'
            });
        }

        // --- B) Requester HAS organization (firm user) ---
        const requesterOrgId = requester.organizationId.toString();

        // B1) Same firm — send invitation (consent-based)
        if (userToAdd.organizationId && userToAdd.organizationId.toString() === requesterOrgId) {
            // Check for existing pending invitation
            const existingInvitation = await CaseTeamInvitation.findOne({
                caseId: caseDoc._id,
                invitedEmail: userToAdd.email.toLowerCase(),
                status: 'pending',
                expiresAt: { $gt: new Date() }
            });
            if (existingInvitation) {
                res.status(400);
                throw new Error('An invitation has already been sent to this user for this case');
            }

            // Create invitation instead of direct add
            const invitation = await CaseTeamInvitation.create({
                caseId: caseDoc._id,
                invitedBy: requester._id,
                invitedEmail: userToAdd.email.toLowerCase(),
                invitedUserId: userToAdd._id,
                role: role || 'Member'
            });

            // Send email
            const frontendUrl = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',')[0].trim();
            const acceptLink = `${frontendUrl}/team/case-invite/${invitation.token}/accept`;
            const rejectLink = `${frontendUrl}/team/case-invite/${invitation.token}/reject`;
            const inviterName = `${requester.firstName} ${requester.lastName || ''}`.trim();

            const emailHtml = teamInvitationTemplate(
                inviterName,
                caseDoc.title,
                caseDoc.legalMatter,
                acceptLink,
                rejectLink
            );
            sendEmail({
                email: userToAdd.email,
                subject: `Team Invitation: "${caseDoc.title}" - LawFirmAI`,
                html: emailHtml
            }).catch(err => console.error('Failed to send team invitation email:', err));

            // In-app notification
            await createNotification(io, {
                recipient: userToAdd._id,
                type: 'system',
                title: 'Case Team Invitation',
                description: `${inviterName} invited you to join the team for "${caseDoc.title}"`,
                link: `/team/case-invite/${invitation.token}`,
                metadata: {
                    type: 'case_team_invitation',
                    caseId: caseDoc._id,
                    token: invitation.token
                }
            });

            return res.status(201).json({
                success: true,
                action: 'invitation_sent',
                message: 'Invitation sent to user'
            });
        }

        // B2) External advocate — requires firm admin approval
        // Check no duplicate pending request
        const existingRequest = await CaseTeamRequest.findOne({
            caseId: caseDoc._id,
            requestedUserId: userToAdd._id,
            status: 'pending'
        });
        if (existingRequest) {
            res.status(400);
            throw new Error('A pending approval request already exists for this user on this case');
        }

        // Create CaseTeamRequest
        const teamRequest = await CaseTeamRequest.create({
            caseId: caseDoc._id,
            requestedUserId: userToAdd._id,
            requestedByUserId: requester._id,
            organizationId: requester.organizationId,
            role: role || 'Member'
        });

        // Find org admins
        const org = await Organization.findById(requester.organizationId);
        if (org) {
            const activeAdmins = org.members.filter(
                m => m.role === 'ADMIN' && m.status === 'ACTIVE'
            );
            const adderName = `${requester.firstName} ${requester.lastName || ''}`.trim();

            for (const adminMember of activeAdmins) {
                await createNotification(io, {
                    recipient: adminMember.userId,
                    type: 'system',
                    title: 'Case Team Request',
                    description: `${adderName} wants to add an external advocate to case "${caseDoc.title}"`,
                    link: null,
                    metadata: {
                        type: 'case_team_request',
                        requestId: teamRequest._id
                    }
                });
            }
        }

        return res.status(201).json({
            success: true,
            action: 'pending_approval',
            message: 'Request sent to firm admin for approval'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get pending team requests for a case
// @route   GET /cases/:caseId/team/pending-requests
// @access  Private (Lead Attorney only)
const getPendingTeamRequests = async (req, res, next) => {
    try {
        const caseId = req.params.id || req.params.caseId;

        // Use caseDoc from verifyCaseAccess middleware if available, else fetch
        const caseDoc = req.caseDoc || await Case.findById(caseId);
        if (!caseDoc) {
            res.status(404);
            throw new Error('Case not found');
        }

        if (caseDoc.leadAttorneyId.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Only the lead attorney can view pending requests');
        }

        const requests = await CaseTeamRequest.find({
            caseId: caseDoc._id,
            status: 'pending'
        })
            .populate('requestedUserId', 'firstName lastName email')
            .populate('requestedByUserId', 'firstName lastName email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            requests: requests.map(r => ({
                _id: r._id,
                status: r.status,
                role: r.role,
                createdAt: r.createdAt,
                requestedUser: r.requestedUserId ? {
                    _id: r.requestedUserId._id,
                    firstName: r.requestedUserId.firstName,
                    lastName: r.requestedUserId.lastName,
                    email: r.requestedUserId.email
                } : null,
                requestedBy: r.requestedByUserId ? {
                    _id: r.requestedByUserId._id,
                    firstName: r.requestedByUserId.firstName,
                    lastName: r.requestedByUserId.lastName,
                    email: r.requestedByUserId.email
                } : null
            }))
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    validateEmailForInvite,
    validateTeamMember,
    acceptCaseTeamInvitation,
    rejectCaseTeamInvitation,
    getMyCaseTeamInvitations,
    removeTeamMember,
    leaveTeam,
    updateLeadAttorney,
    getTeamInvitations,
    addTeamMember,
    getPendingTeamRequests
};
