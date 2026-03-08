import React, { useState, useEffect } from 'react';
import { Settings, Activity, AlertTriangle, Trash2 } from 'lucide-react';
import organizationService from '../../services/organizationService';
import type { Organization, OrgActivityLogEntry } from '../../services/organizationService';
import toast from 'react-hot-toast';

interface SettingsTabProps {
    org: Organization;
    onRefresh: () => void;
}

const ACTION_LABELS: Record<string, string> = {
    MEMBER_JOINED: 'Member joined',
    MEMBER_REMOVED: 'Member removed',
    MEMBER_LEFT: 'Member left',
    SEAT_ADDED: 'Seat added',
    SEAT_CANCELLED: 'Seat cancelled',
    INVITE_SENT: 'Invitation sent',
    INVITE_ACCEPTED: 'Invitation accepted',
    INVITE_DECLINED: 'Invitation declined',
    INVITE_REVOKED: 'Invitation revoked',
    ORG_UPDATED: 'Organization updated',
    ORG_DELETED: 'Organization deleted',
};

const ACTION_TYPES = [
    '', 'MEMBER_JOINED', 'MEMBER_REMOVED', 'MEMBER_LEFT',
    'SEAT_ADDED', 'SEAT_CANCELLED',
    'INVITE_SENT', 'INVITE_ACCEPTED', 'INVITE_DECLINED', 'INVITE_REVOKED',
    'ORG_UPDATED'
];

const SettingsTab: React.FC<SettingsTabProps> = ({ org, onRefresh }) => {
    const [name, setName] = useState(org.name);
    const [description, setDescription] = useState(org.description || '');
    const [saving, setSaving] = useState(false);

    // Activity log state
    const [activityLogs, setActivityLogs] = useState<OrgActivityLogEntry[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [logFilter, setLogFilter] = useState('');
    const [logPage, setLogPage] = useState(1);
    const [totalLogPages, setTotalLogPages] = useState(1);

    // Delete org state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteOrgName, setDeleteOrgName] = useState('');
    const [deleting, setDeleting] = useState(false);

    const fetchLogs = async (page = 1, type = logFilter) => {
        try {
            setLoadingLogs(true);
            const params: { limit: number; page: number; type?: string } = { limit: 20, page };
            if (type) params.type = type;
            const data = await organizationService.getActivityLog(params);
            setActivityLogs(data.logs);
            setTotalLogPages(data.pagination.pages);
            setLogPage(data.pagination.page);
        } catch {
            // Silently fail
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        fetchLogs(1, logFilter);
    }, [logFilter]);

    const handleSaveDetails = async () => {
        if (!name.trim()) {
            toast.error('Organization name is required');
            return;
        }
        try {
            setSaving(true);
            const result = await organizationService.updateOrganization({
                name: name.trim(),
                description: description.trim()
            });
            toast.success(result.message || 'Organization updated');
            onRefresh();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to update organization');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteOrganization = async () => {
        try {
            setDeleting(true);
            await organizationService.deleteOrganization();
            toast.success('Organization deleted');
            // Update localStorage and reload
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.organizationId = null;
                user.role = 'ADVOCATE';
                user.subscriptionStatus = 'INACTIVE';
                localStorage.setItem('user', JSON.stringify(user));
            }
            window.location.href = '/portal/firm-connect';
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to delete organization');
        } finally {
            setDeleting(false);
        }
    };

    const formatLogEntry = (entry: OrgActivityLogEntry) => {
        const actorName = entry.actorId
            ? `${entry.actorId.firstName} ${entry.actorId.lastName}`
            : 'System';
        const targetName = entry.targetId
            ? `${entry.targetId.firstName} ${entry.targetId.lastName}`
            : null;

        let detail = ACTION_LABELS[entry.action] || entry.action;
        if (targetName) detail += ` (${targetName})`;
        if (entry.metadata?.email) detail += ` - ${entry.metadata.email}`;

        return { actorName, detail };
    };

    return (
        <div className="space-y-6">
            {/* Firm Details */}
            <div className="card-surface p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <Settings className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
                    Firm Details
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                            Organization Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2"
                            style={{
                                borderColor: 'var(--color-surface-border)',
                                color: 'var(--color-text-primary)',
                                backgroundColor: 'var(--color-surface)',
                                '--tw-ring-color': 'var(--color-accent-glow)'
                            } as React.CSSProperties}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={500}
                            rows={3}
                            placeholder="Brief description of your firm..."
                            className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2 resize-none"
                            style={{
                                borderColor: 'var(--color-surface-border)',
                                color: 'var(--color-text-primary)',
                                backgroundColor: 'var(--color-surface)',
                                '--tw-ring-color': 'var(--color-accent-glow)'
                            } as React.CSSProperties}
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                            {description.length}/500 characters
                        </p>
                    </div>
                    <button
                        onClick={handleSaveDetails}
                        disabled={saving || (!name.trim())}
                        className="btn-gradient px-6 py-2.5 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Activity Log */}
            <div className="card-surface p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        <Activity className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
                        Activity Log
                    </h3>
                    <select
                        value={logFilter}
                        onChange={(e) => setLogFilter(e.target.value)}
                        className="px-3 py-1.5 text-sm rounded-lg border focus:outline-none"
                        style={{
                            borderColor: 'var(--color-surface-border)',
                            color: 'var(--color-text-primary)',
                            backgroundColor: 'var(--color-surface)'
                        }}
                    >
                        <option value="">All Actions</option>
                        {ACTION_TYPES.filter(Boolean).map(type => (
                            <option key={type} value={type}>{ACTION_LABELS[type]}</option>
                        ))}
                    </select>
                </div>

                {loadingLogs ? (
                    <div className="flex justify-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
                    </div>
                ) : activityLogs.length === 0 ? (
                    <p className="text-center py-6" style={{ color: 'var(--color-text-tertiary)' }}>
                        No activity logs found.
                    </p>
                ) : (
                    <>
                        <div className="space-y-3">
                            {activityLogs.map((entry) => {
                                const { actorName, detail } = formatLogEntry(entry);
                                return (
                                    <div key={entry._id} className="flex items-start gap-3 py-2 border-b" style={{ borderColor: 'var(--color-surface-border)' }}>
                                        <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: 'var(--color-accent)' }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                                <span className="font-medium">{actorName}</span>: {detail}
                                            </p>
                                            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                                {new Date(entry.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalLogPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <button
                                    onClick={() => fetchLogs(logPage - 1)}
                                    disabled={logPage <= 1}
                                    className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50"
                                    style={{ borderColor: 'var(--color-surface-border)', color: 'var(--color-text-primary)' }}
                                >
                                    Previous
                                </button>
                                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                    Page {logPage} of {totalLogPages}
                                </span>
                                <button
                                    onClick={() => fetchLogs(logPage + 1)}
                                    disabled={logPage >= totalLogPages}
                                    className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50"
                                    style={{ borderColor: 'var(--color-surface-border)', color: 'var(--color-text-primary)' }}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Danger Zone */}
            <div className="rounded-xl border-2 border-red-200 p-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                    Deleting the organization will remove all members, cancel all seat subscriptions, and is irreversible.
                </p>

                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 border-2 border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" /> Delete Organization
                    </button>
                ) : (
                    <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-3">
                        <p className="text-sm font-medium text-red-800">
                            Type <strong>{org.name}</strong> to confirm deletion:
                        </p>
                        <input
                            type="text"
                            value={deleteOrgName}
                            onChange={(e) => setDeleteOrgName(e.target.value)}
                            placeholder={org.name}
                            className="w-full px-4 py-2.5 rounded-lg text-sm border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-300"
                        />
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleDeleteOrganization}
                                disabled={deleteOrgName !== org.name || deleting}
                                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {deleting ? 'Deleting...' : 'Permanently Delete'}
                            </button>
                            <button
                                onClick={() => { setShowDeleteConfirm(false); setDeleteOrgName(''); }}
                                className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsTab;
