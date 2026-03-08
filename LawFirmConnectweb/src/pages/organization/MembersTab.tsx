import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Crown, Shield, Trash2, MoreVertical, Eye, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import organizationService from '../../services/organizationService';
import type { Organization, OrganizationMember, CaseForReassignment } from '../../services/organizationService';
import ConfirmationModal from '../../components/ConfirmationModal';
import toast from 'react-hot-toast';

interface MembersTabProps {
    org: Organization;
    members: OrganizationMember[];
    onRefresh: () => void;
}

const MembersTab: React.FC<MembersTabProps> = ({ org, members, onRefresh }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);
    const [removing, setRemoving] = useState(false);
    const [casesToReassign, setCasesToReassign] = useState<CaseForReassignment[]>([]);
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [reassignTarget, setReassignTarget] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const userStr = localStorage.getItem('user');
    const currentUserId = userStr ? JSON.parse(userStr)?._id : '';

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredMembers = members.filter((m) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const name = `${m.userId.firstName} ${m.userId.lastName}`.toLowerCase();
        return name.includes(q) || m.userId.email.toLowerCase().includes(q);
    });

    const handleRemoveClick = (member: OrganizationMember) => {
        setMemberToRemove(member);
        setShowRemoveConfirm(true);
    };

    const handleRemoveConfirm = async () => {
        if (!memberToRemove) return;
        try {
            setRemoving(true);
            const result = await organizationService.removeMember(memberToRemove.userId._id);
            setShowRemoveConfirm(false);

            if (result.casesNeedingReassignment.length > 0) {
                setCasesToReassign(result.casesNeedingReassignment);
                setShowReassignModal(true);
            } else {
                toast.success('Member removed successfully');
                setMemberToRemove(null);
                onRefresh();
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to remove member');
        } finally {
            setRemoving(false);
        }
    };

    const handleReassign = async () => {
        if (!reassignTarget || !memberToRemove) return;
        try {
            const caseIds = casesToReassign.map(c => c._id);
            await organizationService.reassignCases(
                memberToRemove.userId._id,
                reassignTarget,
                caseIds
            );
            toast.success('Cases reassigned successfully');
            setShowReassignModal(false);
            setMemberToRemove(null);
            setCasesToReassign([]);
            setReassignTarget('');
            onRefresh();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to reassign cases');
        }
    };

    return (
        <div className="space-y-6">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search members by name or email..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-sm border focus:outline-none focus:ring-2"
                    style={{
                        borderColor: 'var(--color-surface-border)',
                        color: 'var(--color-text-primary)',
                        backgroundColor: 'var(--color-surface)',
                        '--tw-ring-color': 'var(--color-accent-glow)'
                    } as React.CSSProperties}
                />
            </div>

            {/* Members Table */}
            <div className="card-surface p-6">
                <h3 className="font-semibold mb-6 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <Users className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
                    Members ({filteredMembers.length})
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm border-b" style={{ color: 'var(--color-text-tertiary)', borderColor: 'var(--color-surface-border)' }}>
                                <th className="pb-3 font-medium">Member</th>
                                <th className="pb-3 font-medium">Email</th>
                                <th className="pb-3 font-medium">Role</th>
                                <th className="pb-3 font-medium">Seat Plan</th>
                                <th className="pb-3 font-medium">Joined</th>
                                <th className="pb-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMembers.map((member) => {
                                const assignedSeat = org.seats?.find(
                                    s => s.assignedTo && (typeof s.assignedTo === 'object' ? s.assignedTo._id : s.assignedTo) === member.userId._id && s.status === 'ACTIVE'
                                );
                                return (
                                    <tr key={member.userId._id} className="border-b hover:bg-slate-50/50 transition-colors" style={{ borderColor: 'var(--color-surface-border)' }}>
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs"
                                                     style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                                                    {member.userId.firstName?.[0]}{member.userId.lastName?.[0]}
                                                </div>
                                                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                                    {member.userId.firstName} {member.userId.lastName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{member.userId.email}</td>
                                        <td className="py-4">
                                            {member.role === 'ADMIN' ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                                                    <Crown className="h-3 w-3" /> Admin
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
                                                    <Shield className="h-3 w-3" /> Attorney
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4">
                                            {assignedSeat ? (
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                                    assignedSeat.plan === 'PROFESSIONAL'
                                                        ? 'text-purple-700 bg-purple-100'
                                                        : 'text-blue-700 bg-blue-100'
                                                }`}>
                                                    {assignedSeat.plan}
                                                </span>
                                            ) : member.role === 'ADMIN' ? (
                                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-amber-700 bg-amber-100">FIRM</span>
                                            ) : (
                                                <span className="text-xs italic" style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                                            )}
                                        </td>
                                        <td className="py-4 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                                            {new Date(member.joinedAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 text-right">
                                            {member.userId._id !== currentUserId && member.role !== 'ADMIN' && (
                                                <div className="relative inline-block" ref={activeMenu === member.userId._id ? menuRef : null}>
                                                    <button
                                                        onClick={() => setActiveMenu(activeMenu === member.userId._id ? null : member.userId._id)}
                                                        className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                                                        style={{ color: 'var(--color-text-tertiary)' }}
                                                        title="Actions"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </button>
                                                    {activeMenu === member.userId._id && (
                                                        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-lg border py-1 z-50"
                                                             style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                                                            <button
                                                                onClick={() => {
                                                                    setActiveMenu(null);
                                                                    const name = `${member.userId.firstName} ${member.userId.lastName}`;
                                                                    navigate(`/portal/cases?userId=${member.userId._id}&name=${encodeURIComponent(name)}`);
                                                                }}
                                                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
                                                                style={{ color: 'var(--color-text-primary)' }}
                                                            >
                                                                <Eye className="h-4 w-4 text-indigo-500" /> View Cases
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setActiveMenu(null);
                                                                    handleRemoveClick(member);
                                                                }}
                                                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" /> Remove
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredMembers.length === 0 && (
                    <p className="text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>
                        {searchQuery ? 'No members match your search.' : 'No members yet.'}
                    </p>
                )}
            </div>

            {/* Remove Confirmation Modal */}
            {showRemoveConfirm && memberToRemove && (
                <ConfirmationModal
                    isOpen={showRemoveConfirm}
                    onClose={() => { setShowRemoveConfirm(false); setMemberToRemove(null); }}
                    onConfirm={handleRemoveConfirm}
                    title="Remove Member"
                    message={`Are you sure you want to remove ${memberToRemove.userId.firstName} ${memberToRemove.userId.lastName} from the organization? Their data will be preserved but they will lose portal access.`}
                    confirmText={removing ? 'Removing...' : 'Remove'}
                    type="danger"
                />
            )}

            {/* Case Reassignment Modal */}
            {showReassignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowReassignModal(false)} />
                    <div className="relative rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 z-10" style={{ backgroundColor: 'var(--color-surface)' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                <ArrowRightLeft className="h-5 w-5 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Reassign Cases</h3>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-amber-800">
                                    {casesToReassign.length} case(s) need to be reassigned to another member.
                                </p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Cases:</p>
                            <ul className="space-y-1 max-h-32 overflow-y-auto">
                                {casesToReassign.map(c => (
                                    <li key={c._id} className="text-sm py-1 px-3 rounded" style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                                        {c.title} ({c.status})
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mb-6">
                            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--color-text-primary)' }}>
                                Reassign to:
                            </label>
                            <select
                                value={reassignTarget}
                                onChange={(e) => setReassignTarget(e.target.value)}
                                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2"
                                style={{
                                    borderColor: 'var(--color-surface-border)',
                                    color: 'var(--color-text-primary)',
                                    backgroundColor: 'var(--color-surface)',
                                    '--tw-ring-color': 'var(--color-accent-glow)'
                                } as React.CSSProperties}
                            >
                                <option value="">Select a member...</option>
                                {members
                                    .filter(m => m.userId._id !== memberToRemove?.userId._id)
                                    .map(m => (
                                        <option key={m.userId._id} value={m.userId._id}>
                                            {m.userId.firstName} {m.userId.lastName} ({m.role})
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowReassignModal(false)}
                                className="flex-1 py-3 border rounded-xl font-medium hover:bg-slate-50 transition-colors"
                                style={{ borderColor: 'var(--color-surface-border)', color: 'var(--color-text-primary)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReassign}
                                disabled={!reassignTarget}
                                className="btn-gradient flex-1 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Reassign & Complete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MembersTab;
