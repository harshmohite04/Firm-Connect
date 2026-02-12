import React, { useState, useEffect } from 'react';
import PortalLayout from '../components/PortalLayout';
import organizationService from '../services/organizationService';
import type { Organization, OrganizationMember, Invitation } from '../services/organizationService';
import toast from 'react-hot-toast';
import { UserPlus, Users, Mail, Clock, CheckCircle, Building2, Crown, Shield, Trash2 } from 'lucide-react';

const FirmConnect: React.FC = () => {
    const [org, setOrg] = useState<Organization | null>(null);
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [totalSeats, setTotalSeats] = useState(0);
    const [usedSeats, setUsedSeats] = useState(0);
    const [inviteEmail, setInviteEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState(false);
    const [userRole, setUserRole] = useState('');

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
            setTotalSeats(membersData.totalSeats);
            setUsedSeats(membersData.usedSeats);

            if (user?.role === 'ADMIN') {
                const invData = await organizationService.getInvitations();
                setInvitations(invData);
            }
        } catch (error: any) {
            console.error('Error fetching org data:', error);
            if (error?.response?.status !== 404) {
                toast.error('Failed to load organization data');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        try {
            setInviting(true);
            const result = await organizationService.inviteMember(inviteEmail.trim());
            toast.success(result.message || `Member added: ${inviteEmail}`);
            setInviteEmail('');
            fetchData(); // Refresh
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to add member');
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveMember = async (userId: string, memberName: string) => {
        if (!window.confirm(`Remove ${memberName} from the organization? They will lose portal access.`)) return;

        try {
            const result = await organizationService.removeMember(userId);
            toast.success(result.message || 'Member removed');
            fetchData();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to remove member');
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

    if (!org) {
        return (
            <PortalLayout>
                <div className="max-w-2xl mx-auto text-center py-20">
                    <Building2 className="mx-auto h-16 w-16 text-slate-300 mb-6" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">No Organization Found</h2>
                    <p className="text-slate-500">
                        {userRole === 'ATTORNEY'
                            ? 'You are not part of any firm yet. Ask your firm admin to invite you.'
                            : 'Purchase a plan from the Pricing page to create your firm.'}
                    </p>
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
                        <h1 className="text-3xl font-bold text-slate-900">{org.name}</h1>
                    </div>
                    <p className="text-slate-500">
                        {org.plan} Plan · {usedSeats}/{totalSeats} seats used
                    </p>
                </div>

                {/* Seat Usage Bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-slate-900">Seat Usage</h3>
                        <span className="text-sm font-medium text-slate-500">
                            {usedSeats} of {totalSeats} seats
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3">
                        <div
                            className={`h-3 rounded-full transition-all duration-500 ${
                                usedSeats >= totalSeats ? 'bg-red-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${Math.min((usedSeats / totalSeats) * 100, 100)}%` }}
                        />
                    </div>
                    {usedSeats >= totalSeats && (
                        <p className="text-red-500 text-sm mt-2">
                            All seats are filled. Upgrade your plan to add more members.
                        </p>
                    )}
                </div>

                {/* Invite Form (Admin Only) */}
                {userRole === 'ADMIN' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-indigo-600" />
                            Invite a Member
                        </h3>
                        <form onSubmit={handleInvite} className="flex gap-3">
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="Enter email address..."
                                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900"
                                disabled={usedSeats >= totalSeats || inviting}
                            />
                            <button
                                type="submit"
                                disabled={usedSeats >= totalSeats || inviting || !inviteEmail.trim()}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                            >
                                {inviting ? 'Sending...' : 'Send Invite'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Pending Invitations (Admin Only) */}
                {userRole === 'ADMIN' && invitations.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-amber-500" />
                            Pending Invitations ({invitations.length})
                        </h3>
                        <div className="space-y-3">
                            {invitations.map((inv) => (
                                <div key={inv._id} className="flex items-center justify-between py-3 px-4 bg-amber-50 rounded-xl border border-amber-100">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-amber-500" />
                                        <div>
                                            <p className="font-medium text-slate-900">{inv.invitedEmail}</p>
                                            <p className="text-xs text-slate-500">
                                                Expires {new Date(inv.expiresAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                                        Pending
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Members List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-600" />
                        Firm Members ({members.length})
                    </h3>
                    <div className="space-y-3">
                        {members.map((member) => (
                            <div
                                key={member.userId._id}
                                className="flex items-center justify-between py-4 px-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                        {member.userId.firstName?.[0]}{member.userId.lastName?.[0]}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">
                                            {member.userId.firstName} {member.userId.lastName}
                                        </p>
                                        <p className="text-sm text-slate-500">{member.userId.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {member.role === 'ADMIN' ? (
                                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full">
                                            <Crown className="h-3 w-3" /> Admin
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-full">
                                            <Shield className="h-3 w-3" /> Attorney
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1 text-xs text-green-600">
                                        <CheckCircle className="h-3 w-3" /> Active
                                    </span>
                                    {userRole === 'ADMIN' && member.role !== 'ADMIN' && (
                                        <button
                                            onClick={() => handleRemoveMember(member.userId._id, `${member.userId.firstName} ${member.userId.lastName}`)}
                                            className="ml-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove member"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {members.length === 0 && (
                            <p className="text-center text-slate-400 py-8">
                                No members yet. Invite someone to get started!
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </PortalLayout>
    );
};

export default FirmConnect;
