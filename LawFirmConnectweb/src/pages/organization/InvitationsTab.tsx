import React, { useState, useEffect } from 'react';
import { UserPlus, Clock, Mail, X, History, CheckCircle, XCircle, Ban, TimerOff } from 'lucide-react';
import organizationService from '../../services/organizationService';
import type { Invitation, InvitationHistoryEntry } from '../../services/organizationService';
import toast from 'react-hot-toast';

interface InvitationsTabProps {
    invitations: Invitation[];
    totalSeats: number;
    usedSeats: number;
    onRefresh: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    accepted: { label: 'Accepted', className: 'text-green-700 bg-green-100', icon: <CheckCircle className="h-3 w-3" /> },
    rejected: { label: 'Declined', className: 'text-red-700 bg-red-100', icon: <XCircle className="h-3 w-3" /> },
    revoked: { label: 'Revoked', className: 'text-orange-700 bg-orange-100', icon: <Ban className="h-3 w-3" /> },
    expired: { label: 'Expired', className: 'text-slate-700 bg-slate-100', icon: <TimerOff className="h-3 w-3" /> },
};

const InvitationsTab: React.FC<InvitationsTabProps> = ({ invitations, totalSeats, usedSeats, onRefresh }) => {
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);
    const [history, setHistory] = useState<InvitationHistoryEntry[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await organizationService.getInvitationHistory();
                setHistory(data);
            } catch {
                // Silently fail
            } finally {
                setLoadingHistory(false);
            }
        };
        fetchHistory();
    }, [invitations]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        try {
            setInviting(true);
            const result = await organizationService.inviteMember(inviteEmail.trim());
            toast.success(result.message || `Invitation sent to ${inviteEmail}`);
            setInviteEmail('');
            onRefresh();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to send invitation');
        } finally {
            setInviting(false);
        }
    };

    const handleRevokeInvitation = async (invitationId: string) => {
        try {
            await organizationService.revokeInvitation(invitationId);
            toast.success('Invitation revoked');
            onRefresh();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to revoke invitation');
        }
    };

    const noSeatsAvailable = usedSeats >= totalSeats;

    return (
        <div className="space-y-6">
            {/* Invite Form */}
            <div className="card-surface p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <UserPlus className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
                    Invite a Member
                </h3>
                <form onSubmit={handleInvite} className="flex gap-3">
                    <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Enter email address..."
                        className="flex-1 px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2"
                        style={{
                            borderColor: 'var(--color-surface-border)',
                            color: 'var(--color-text-primary)',
                            backgroundColor: 'var(--color-surface)',
                            '--tw-ring-color': 'var(--color-accent-glow)'
                        } as React.CSSProperties}
                        disabled={noSeatsAvailable || inviting}
                    />
                    <button
                        type="submit"
                        disabled={noSeatsAvailable || inviting || !inviteEmail.trim()}
                        className="btn-gradient px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {inviting ? 'Sending...' : 'Send Invite'}
                    </button>
                </form>
                {noSeatsAvailable && (
                    <p className="text-red-500 text-sm mt-2">
                        No seats available. Add more seats before inviting members.
                    </p>
                )}
            </div>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
                <div className="card-surface p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        <Clock className="h-5 w-5 text-amber-500" />
                        Pending Invitations ({invitations.length})
                    </h3>
                    <div className="space-y-3">
                        {invitations.map((inv) => (
                            <div key={inv._id} className="flex items-center justify-between py-3 px-4 bg-amber-50 rounded-xl border border-amber-100">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-amber-500" />
                                    <div>
                                        <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{inv.invitedEmail}</p>
                                        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                            Expires {new Date(inv.expiresAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRevokeInvitation(inv._id)}
                                    className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors"
                                    title="Revoke invitation"
                                >
                                    <X className="h-3 w-3" /> Revoke
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Invitation History */}
            <div className="card-surface p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <History className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
                    Invitation History
                </h3>

                {loadingHistory ? (
                    <div className="flex justify-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-center py-6" style={{ color: 'var(--color-text-tertiary)' }}>
                        No invitation history yet.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-sm border-b" style={{ color: 'var(--color-text-tertiary)', borderColor: 'var(--color-surface-border)' }}>
                                    <th className="pb-3 font-medium">Email</th>
                                    <th className="pb-3 font-medium">Status</th>
                                    <th className="pb-3 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((inv) => {
                                    const config = STATUS_CONFIG[inv.status] || STATUS_CONFIG.expired;
                                    return (
                                        <tr key={inv._id} className="border-b" style={{ borderColor: 'var(--color-surface-border)' }}>
                                            <td className="py-3 text-sm" style={{ color: 'var(--color-text-primary)' }}>{inv.invitedEmail}</td>
                                            <td className="py-3">
                                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${config.className}`}>
                                                    {config.icon} {config.label}
                                                </span>
                                            </td>
                                            <td className="py-3 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                                                {new Date(inv.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvitationsTab;
