import React, { useState, useEffect } from 'react';
import { Users, Armchair, CreditCard, Activity } from 'lucide-react';
import organizationService from '../../services/organizationService';
import type { Organization, OrganizationMember, OrgActivityLogEntry } from '../../services/organizationService';

interface OverviewTabProps {
    org: Organization;
    members: OrganizationMember[];
    totalSeats: number;
    usedSeats: number;
    onSwitchTab: (tab: string) => void;
}

const ACTION_LABELS: Record<string, string> = {
    MEMBER_JOINED: 'joined the organization',
    MEMBER_REMOVED: 'was removed from the organization',
    MEMBER_LEFT: 'left the organization',
    SEAT_ADDED: 'A new seat was added',
    SEAT_CANCELLED: 'A seat was cancelled',
    INVITE_SENT: 'An invitation was sent',
    INVITE_ACCEPTED: 'accepted an invitation',
    INVITE_DECLINED: 'declined an invitation',
    INVITE_REVOKED: 'An invitation was revoked',
    ORG_UPDATED: 'Organization details were updated',
    ORG_DELETED: 'Organization was deleted',
};

const OverviewTab: React.FC<OverviewTabProps> = ({ org, members, totalSeats, usedSeats, onSwitchTab }) => {
    const [recentActivity, setRecentActivity] = useState<OrgActivityLogEntry[]>([]);
    const [loadingActivity, setLoadingActivity] = useState(true);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const data = await organizationService.getActivityLog({ limit: 10 });
                setRecentActivity(data.logs);
            } catch {
                // Silently fail — activity log is supplementary
            } finally {
                setLoadingActivity(false);
            }
        };
        fetchActivity();
    }, []);

    const formatActivityEntry = (entry: OrgActivityLogEntry) => {
        const actorName = entry.actorId
            ? `${entry.actorId.firstName} ${entry.actorId.lastName}`
            : 'System';
        const targetName = entry.targetId
            ? `${entry.targetId.firstName} ${entry.targetId.lastName}`
            : null;
        const label = ACTION_LABELS[entry.action] || entry.action;

        if (entry.action === 'MEMBER_REMOVED' && targetName) {
            return `${targetName} ${label} by ${actorName}`;
        }
        if (['MEMBER_JOINED', 'MEMBER_LEFT', 'INVITE_ACCEPTED', 'INVITE_DECLINED'].includes(entry.action)) {
            return `${actorName} ${label}`;
        }
        if (entry.action === 'INVITE_SENT' && entry.metadata?.email) {
            return `${actorName} sent an invitation to ${entry.metadata.email}`;
        }
        if (entry.action === 'INVITE_REVOKED' && entry.metadata?.email) {
            return `${actorName} revoked invitation for ${entry.metadata.email}`;
        }
        return `${actorName}: ${label}`;
    };

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-surface p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
                            <Users className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
                        </div>
                        <div>
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Total Members</p>
                            <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{members.length}</p>
                        </div>
                    </div>
                </div>

                <div className="card-surface p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50">
                            <Armchair className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Active Seats</p>
                            <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{usedSeats}/{totalSeats}</p>
                        </div>
                    </div>
                </div>

                <div className="card-surface p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50">
                            <CreditCard className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Subscription</p>
                            <p className="text-2xl font-bold text-green-600">{org.subscriptionStatus}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Seat Usage Bar */}
            <div className="card-surface p-6">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Seat Usage</h3>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        {usedSeats} of {totalSeats} seats
                    </span>
                </div>
                <div className="w-full rounded-full h-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                    <div
                        className="h-3 rounded-full transition-all duration-500"
                        style={{
                            width: `${totalSeats > 0 ? Math.min((usedSeats / totalSeats) * 100, 100) : 0}%`,
                            background: usedSeats >= totalSeats ? '#EF4444' : 'var(--gradient-accent)'
                        }}
                    />
                </div>
                {usedSeats >= totalSeats && (
                    <p className="text-red-500 text-sm mt-2">
                        All seats are filled. Add more seats to invite new members.
                    </p>
                )}
            </div>

            {/* Recent Activity */}
            <div className="card-surface p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        <Activity className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
                        Recent Activity
                    </h3>
                    <button
                        onClick={() => onSwitchTab('settings')}
                        className="text-sm font-medium hover:underline"
                        style={{ color: 'var(--color-accent)' }}
                    >
                        View All
                    </button>
                </div>
                {loadingActivity ? (
                    <div className="flex justify-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
                    </div>
                ) : recentActivity.length === 0 ? (
                    <p className="text-center py-6" style={{ color: 'var(--color-text-tertiary)' }}>
                        No activity recorded yet.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {recentActivity.map((entry) => (
                            <div key={entry._id} className="flex items-start gap-3 py-2">
                                <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: 'var(--color-accent)' }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                        {formatActivityEntry(entry)}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                        {new Date(entry.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                    onClick={() => onSwitchTab('members')}
                    className="card-surface p-4 text-center hover:shadow-md transition-shadow rounded-xl"
                >
                    <Users className="h-5 w-5 mx-auto mb-2" style={{ color: 'var(--color-accent)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Manage Members</span>
                </button>
                <button
                    onClick={() => onSwitchTab('seats')}
                    className="card-surface p-4 text-center hover:shadow-md transition-shadow rounded-xl"
                >
                    <Armchair className="h-5 w-5 mx-auto mb-2" style={{ color: 'var(--color-accent)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Seats & Billing</span>
                </button>
                <button
                    onClick={() => onSwitchTab('invitations')}
                    className="card-surface p-4 text-center hover:shadow-md transition-shadow rounded-xl"
                >
                    <CreditCard className="h-5 w-5 mx-auto mb-2" style={{ color: 'var(--color-accent)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Invitations</span>
                </button>
                <button
                    onClick={() => onSwitchTab('settings')}
                    className="card-surface p-4 text-center hover:shadow-md transition-shadow rounded-xl"
                >
                    <Activity className="h-5 w-5 mx-auto mb-2" style={{ color: 'var(--color-accent)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Settings</span>
                </button>
            </div>
        </div>
    );
};

export default OverviewTab;
