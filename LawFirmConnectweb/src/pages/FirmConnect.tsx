import React, { useState, useEffect } from 'react';
import PortalLayout from '../components/PortalLayout';
import organizationService from '../services/organizationService';
import type { Organization, OrganizationMember, MyInvitation } from '../services/organizationService';
import toast from 'react-hot-toast';
import { Mail, Building2, Crown, Shield, Users, LogOut } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const FirmConnect: React.FC = () => {
    const [org, setOrg] = useState<Organization | null>(null);
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [myInvitations, setMyInvitations] = useState<MyInvitation[]>([]);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [leaveError, setLeaveError] = useState<string | null>(null);
    const [activeCaseTitles, setActiveCaseTitles] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            setUserRole(user?.role || '');

            const orgData = await organizationService.getOrganization();
            setOrg(orgData);

            const membersData = await organizationService.getMembers();
            setMembers(membersData.members);
        } catch (error: any) {
            if (error?.response?.status === 404) {
                try {
                    const invs = await organizationService.getMyInvitations();
                    setMyInvitations(invs);
                } catch {
                    // No invitations
                }
            } else {
                toast.error('Failed to load organization data');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptInvitation = async (token: string) => {
        try {
            const result = await organizationService.acceptInvitation(token);
            toast.success(result.message || 'Invitation accepted!');
            fetchData();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to accept invitation');
        }
    };

    const handleDeclineInvitation = async (token: string) => {
        try {
            await organizationService.rejectInvitation(token);
            toast.success('Invitation declined');
            setMyInvitations(prev => prev.filter(inv => inv.token !== token));
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to decline invitation');
        }
    };

    const handleLeaveOrganization = async () => {
        try {
            setLeaving(true);
            setLeaveError(null);
            setActiveCaseTitles([]);
            await organizationService.leaveOrganization();
            toast.success('You have left the organization');
            // Update localStorage
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.organizationId = null;
                user.subscriptionStatus = 'INACTIVE';
                localStorage.setItem('user', JSON.stringify(user));
            }
            window.location.reload();
        } catch (error: any) {
            const data = error?.response?.data;
            if (data?.activeCases) {
                setActiveCaseTitles(data.activeCases.map((c: any) => c.title));
                setLeaveError(data.message);
            } else {
                toast.error(data?.message || 'Failed to leave organization');
            }
            setShowLeaveConfirm(false);
        } finally {
            setLeaving(false);
        }
    };

    if (loading) {
        return (
            <PortalLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
                </div>
            </PortalLayout>
        );
    }

    // No organization — show invitations or empty state
    if (!org) {
        return (
            <PortalLayout>
                <div className="max-w-2xl mx-auto py-20">
                    {myInvitations.length > 0 ? (
                        <div>
                            <div className="text-center mb-8">
                                <Mail className="mx-auto h-16 w-16 mb-6" style={{ color: 'var(--color-accent)' }} />
                                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                                    You Have Pending Invitation{myInvitations.length > 1 ? 's' : ''}
                                </h2>
                                <p style={{ color: 'var(--color-text-secondary)' }}>
                                    A firm has invited you to join. Accept to start collaborating.
                                </p>
                            </div>
                            <div className="space-y-4">
                                {myInvitations.map((inv) => (
                                    <div key={inv._id} className="card-surface p-6 rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
                                                    <Building2 className="h-6 w-6" style={{ color: 'var(--color-accent)' }} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                                                        {inv.organizationId?.name || 'Unknown Firm'}
                                                    </p>
                                                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleDeclineInvitation(inv.token)}
                                                    className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-red-50 text-red-600 border-red-200"
                                                >
                                                    Decline
                                                </button>
                                                <button
                                                    onClick={() => handleAcceptInvitation(inv.token)}
                                                    className="btn-gradient px-5 py-2 text-sm font-semibold rounded-lg"
                                                >
                                                    Accept
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <Building2 className="mx-auto h-16 w-16 mb-6" style={{ color: 'var(--color-text-tertiary)' }} />
                            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>No Organization Found</h2>
                            <p style={{ color: 'var(--color-text-secondary)' }}>
                                {userRole === 'ADVOCATE'
                                    ? 'You are not part of any firm yet. Ask your firm admin to invite you.'
                                    : 'Purchase a plan from the Pricing page to create your firm.'}
                            </p>
                        </div>
                    )}
                </div>
            </PortalLayout>
        );
    }

    // Find current user's member entry
    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const currentMember = members.find(m => m.userId._id === currentUser?._id);

    return (
        <PortalLayout>
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Firm Header */}
                <div className="card-surface p-6 mb-8 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
                                <Building2 className="h-7 w-7" style={{ color: 'var(--color-accent)' }} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                    {org.name}
                                </h1>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-indigo-700 bg-indigo-100">
                                        {org.plan} Plan
                                    </span>
                                    {currentMember && (
                                        <>
                                            {currentMember.role === 'ADMIN' ? (
                                                <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                                                    <Crown className="h-3 w-3" /> Admin
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
                                                    <Shield className="h-3 w-3" /> Attorney
                                                </span>
                                            )}
                                            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                                Member since {new Date(currentMember.joinedAt).toLocaleDateString()}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team Directory */}
                <div className="card-surface p-6 rounded-xl">
                    <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        <Users className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
                        Team Directory ({members.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {members.map((member) => (
                            <div
                                key={member.userId._id}
                                className="flex items-center gap-4 p-4 rounded-xl transition-colors"
                                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                            >
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                                     style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                                    {member.userId.firstName?.[0]}{member.userId.lastName?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                                        {member.userId.firstName} {member.userId.lastName}
                                    </p>
                                    <p className="text-sm truncate" style={{ color: 'var(--color-text-tertiary)' }}>{member.userId.email}</p>
                                </div>
                                {member.role === 'ADMIN' ? (
                                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full flex-shrink-0">
                                        <Crown className="h-3 w-3" /> Admin
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full flex-shrink-0">
                                        <Shield className="h-3 w-3" /> Attorney
                                    </span>
                                )}
                            </div>
                        ))}
                        {members.length === 0 && (
                            <p className="text-center col-span-2 py-8" style={{ color: 'var(--color-text-tertiary)' }}>
                                No members yet.
                            </p>
                        )}
                    </div>
                </div>

                {/* Leave Organization (Advocate only) */}
                {userRole === 'ADVOCATE' && (
                    <div className="mt-8">
                        {leaveError && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-sm text-red-800 font-medium mb-2">{leaveError}</p>
                                {activeCaseTitles.length > 0 && (
                                    <ul className="text-sm text-red-700 list-disc list-inside">
                                        {activeCaseTitles.map((title, i) => (
                                            <li key={i}>{title}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                        <button
                            onClick={() => setShowLeaveConfirm(true)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="h-4 w-4" /> Leave Organization
                        </button>
                    </div>
                )}

                {/* Leave Confirmation */}
                <ConfirmationModal
                    isOpen={showLeaveConfirm}
                    onClose={() => setShowLeaveConfirm(false)}
                    onConfirm={handleLeaveOrganization}
                    title="Leave Organization"
                    message={`Are you sure you want to leave ${org.name}? You will lose access to all organization resources.`}
                    confirmText={leaving ? 'Leaving...' : 'Leave'}
                    cancelText="Stay"
                    type="danger"
                />
            </div>
        </PortalLayout>
    );
};

export default FirmConnect;
