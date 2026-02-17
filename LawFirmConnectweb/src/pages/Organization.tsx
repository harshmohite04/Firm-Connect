import React, { useState, useEffect } from 'react';
import PortalLayout from '../components/PortalLayout';
import organizationService from '../services/organizationService';
import type { Organization, OrganizationMember, CaseForReassignment } from '../services/organizationService';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';
import { Building2, Users, Trash2, ArrowRightLeft, Shield, Crown, AlertTriangle } from 'lucide-react';

const OrganizationPage: React.FC = () => {
    const [org, setOrg] = useState<Organization | null>(null);
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [currentUserId, setCurrentUserId] = useState('');

    // Removal state
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);
    const [casesToReassign, setCasesToReassign] = useState<CaseForReassignment[]>([]);
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [reassignTarget, setReassignTarget] = useState('');
    const [removing, setRemoving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            setUserRole(user?.role || '');
            setCurrentUserId(user?._id || '');

            const orgData = await organizationService.getOrganization();
            setOrg(orgData);

            const membersData = await organizationService.getMembers();
            setMembers(membersData.members);
        } catch (error: any) {
            console.error('Error fetching org data:', error);
        } finally {
            setLoading(false);
        }
    };

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
                fetchData();
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
            fetchData();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to reassign cases');
        }
    };

    if (loading) {
        return (
            <PortalLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </PortalLayout>
        );
    }

    if (userRole !== 'ADMIN') {
        return (
            <PortalLayout>
                <div className="max-w-2xl mx-auto text-center py-20">
                    <Shield className="mx-auto h-16 w-16 text-slate-300 mb-6" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">Admin Access Only</h2>
                    <p className="text-slate-500">
                        This page is restricted to firm administrators.
                    </p>
                </div>
            </PortalLayout>
        );
    }

    if (!org) {
        return (
            <PortalLayout>
                <div className="max-w-2xl mx-auto text-center py-20">
                    <Building2 className="mx-auto h-16 w-16 text-slate-300 mb-6" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">No Organization</h2>
                    <p className="text-slate-500">Purchase a plan to create your firm.</p>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout>
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Building2 className="h-8 w-8 text-indigo-600" />
                        <h1 className="text-3xl font-bold text-slate-900">Organization Management</h1>
                    </div>
                    <p className="text-slate-500">{org.name} · {org.plan} Plan</p>
                </div>

                {/* Org Info Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <p className="text-sm text-slate-500 mb-1">Plan</p>
                        <p className="text-xl font-bold text-slate-900">{org.plan}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <p className="text-sm text-slate-500 mb-1">Members</p>
                        <p className="text-xl font-bold text-slate-900">
                            {members.length} / {org.maxSeats}
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <p className="text-sm text-slate-500 mb-1">Subscription</p>
                        <p className="text-xl font-bold text-green-600">{org.subscriptionStatus}</p>
                        <p className="text-xs text-slate-400">
                            Expires {new Date(org.subscriptionExpiresAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                {/* Members Management */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-600" />
                        Manage Members
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                                    <th className="pb-3 font-medium">Member</th>
                                    <th className="pb-3 font-medium">Email</th>
                                    <th className="pb-3 font-medium">Role</th>
                                    <th className="pb-3 font-medium">Joined</th>
                                    <th className="pb-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member) => (
                                    <tr key={member.userId._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                                    {member.userId.firstName?.[0]}{member.userId.lastName?.[0]}
                                                </div>
                                                <span className="font-medium text-slate-900">
                                                    {member.userId.firstName} {member.userId.lastName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-sm text-slate-600">{member.userId.email}</td>
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
                                        <td className="py-4 text-sm text-slate-500">
                                            {new Date(member.joinedAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 text-right">
                                            {member.userId._id !== currentUserId && (
                                                <button
                                                    onClick={() => handleRemoveClick(member)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                    title="Remove member"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Remove Confirmation Modal */}
                {showRemoveConfirm && memberToRemove && (
                    <ConfirmationModal
                        isOpen={showRemoveConfirm}
                        onClose={() => setShowRemoveConfirm(false)}
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
                        <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                    <ArrowRightLeft className="h-5 w-5 text-amber-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Reassign Cases</h3>
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
                                <p className="text-sm font-medium text-slate-700 mb-2">Cases:</p>
                                <ul className="space-y-1 max-h-32 overflow-y-auto">
                                    {casesToReassign.map(c => (
                                        <li key={c._id} className="text-sm text-slate-600 py-1 px-3 bg-slate-50 rounded">
                                            {c.title} ({c.status})
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mb-6">
                                <label className="text-sm font-medium text-slate-700 mb-2 block">
                                    Reassign to:
                                </label>
                                <select
                                    value={reassignTarget}
                                    onChange={(e) => setReassignTarget(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
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
                                    className="flex-1 py-3 border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReassign}
                                    disabled={!reassignTarget}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    Reassign & Complete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PortalLayout>
    );
};

export default OrganizationPage;
