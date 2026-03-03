import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '../components/PortalLayout';
import organizationService from '../services/organizationService';
import type { Organization, OrganizationMember, Invitation, MyInvitation } from '../services/organizationService';
import toast from 'react-hot-toast';
import axios from 'axios';
import { UserPlus, Users, Mail, Clock, CheckCircle, Building2, Crown, Shield, Trash2, MoreVertical, Eye, X } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

declare global {
    interface Window {
        Razorpay: any;
    }
}

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
    const [userEmail, setUserEmail] = useState('');
    const [showSeatUpgrade, setShowSeatUpgrade] = useState(false);
    const [selectedSeatPlan, setSelectedSeatPlan] = useState<'STARTER' | 'PROFESSIONAL'>('STARTER');
    const [updatingSeats, setUpdatingSeats] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [myInvitations, setMyInvitations] = useState<MyInvitation[]>([]);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
    const [showCancelSeatConfirm, setShowCancelSeatConfirm] = useState(false);
    const [seatToCancel, setSeatToCancel] = useState<{ id: string; assignedName: string | null } | null>(null);
    const [cancellingSeat, setCancellingSeat] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            setUserRole(user?.role || '');
            setUserEmail(user?.email || '');

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
            if (error?.response?.status === 404) {
                // No org — check if there are pending invitations for this user
                try {
                    const invs = await organizationService.getMyInvitations();
                    setMyInvitations(invs);
                } catch {
                    // Ignore — user just has no invitations
                }
            } else {
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

    const handleRemoveMember = (userId: string, memberName: string) => {
        setMemberToRemove({ id: userId, name: memberName });
        setShowRemoveConfirm(true);
    };

    const confirmRemoveMember = async () => {
        if (!memberToRemove) return;
        try {
            const result = await organizationService.removeMember(memberToRemove.id);
            toast.success(result.message || 'Member removed');
            fetchData();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to remove member');
        } finally {
            setMemberToRemove(null);
        }
    };

    const handleCancelSeat = (seatId: string, assignedName: string | null) => {
        setSeatToCancel({ id: seatId, assignedName });
        setShowCancelSeatConfirm(true);
    };

    const confirmCancelSeat = async () => {
        if (!seatToCancel) return;
        try {
            setCancellingSeat(true);
            const result = await organizationService.cancelSeat(seatToCancel.id);
            toast.success(result.message || 'Seat cancelled');
            fetchData();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to cancel seat');
        } finally {
            setCancellingSeat(false);
            setSeatToCancel(null);
            setShowCancelSeatConfirm(false);
        }
    };

    const handleAcceptInvitation = async (token: string) => {
        try {
            const result = await organizationService.acceptInvitation(token);
            toast.success(result.message || 'Invitation accepted!');
            fetchData(); // Reload — user now has an org
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

    const handleRevokeInvitation = async (invitationId: string) => {
        try {
            await organizationService.revokeInvitation(invitationId);
            toast.success('Invitation revoked');
            fetchData();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to revoke invitation');
        }
    };

    const handleAddSeats = async () => {
        try {
            setUpdatingSeats(true);

            // @harsh.com users bypass payment
            if (userEmail.endsWith('@harsh.com')) {
                const result = await organizationService.updateSeats(1);
                toast.success(result.message);
                setShowSeatUpgrade(false);
                fetchData();
                return;
            }

            // All other users go through Razorpay subscription-based seat purchase
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = user?.token;
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const authHeader = { headers: { Authorization: `Bearer ${token}` } };

            // Create seat subscription
            const { data: subRes } = await axios.post(
                `${apiUrl}/payments/create-seat`,
                { seatPlan: selectedSeatPlan },
                authHeader
            );

            if (!subRes.success) {
                toast.error('Failed to create seat subscription');
                setUpdatingSeats(false);
                return;
            }

            const seatPrice = selectedSeatPlan === 'PROFESSIONAL' ? '8,999' : '4,999';
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                subscription_id: subRes.subscriptionId,
                name: 'LawFirmAI',
                description: `${selectedSeatPlan} Seat – ₹${seatPrice}/mo`,
                handler: async function (response: any) {
                    try {
                        const verifyRes = await axios.post(`${apiUrl}/payments/verify-seat`, {
                            razorpay_subscription_id: response.razorpay_subscription_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            seatPlan: selectedSeatPlan,
                        }, authHeader);
                        if (verifyRes.data.success) {
                            toast.success('Seat purchased successfully');
                            setShowSeatUpgrade(false);
                            fetchData();
                        } else {
                            toast.error('Seat verification failed');
                        }
                    } catch (err: any) {
                        toast.error(err?.response?.data?.message || 'Seat upgrade failed after payment');
                    } finally {
                        setUpdatingSeats(false);
                    }
                },
                prefill: {
                    name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
                    email: user?.email,
                },
                theme: { color: '#4F46E5' },
                modal: {
                    ondismiss: function () {
                        setUpdatingSeats(false);
                    },
                },
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
            return; // loading cleared by handler or ondismiss

        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to purchase seat');
        } finally {
            setUpdatingSeats(false);
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

    return (
        <PortalLayout>
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Building2 className="h-8 w-8" style={{ color: 'var(--color-accent)' }} />
                        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{org.name}</h1>
                    </div>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        {org.plan} Plan · {usedSeats}/{totalSeats} seats used
                    </p>
                </div>

                {/* Seat Usage Bar */}
                <div className="card-surface p-6 mb-8">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Seat Usage</h3>
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                            {usedSeats} of {totalSeats} seats
                        </span>
                    </div>
                    <div className="w-full rounded-full h-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                        <div
                            className={`h-3 rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min((usedSeats / totalSeats) * 100, 100)}%`, background: usedSeats >= totalSeats ? '#EF4444' : 'var(--gradient-accent)' }}
                        />
                    </div>
                    {usedSeats >= totalSeats && (
                        <p className="text-red-500 text-sm mt-2">
                            All seats are filled. Add more seats to invite new members.
                        </p>
                    )}
                    {userRole === 'ADMIN' && (
                        <div className="mt-4">
                            {!showSeatUpgrade ? (
                                <button
                                    onClick={() => setShowSeatUpgrade(true)}
                                    className="btn-ghost px-4 py-2 text-sm font-semibold rounded-xl"
                                >
                                    + Add Seats
                                </button>
                            ) : (
                                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Select plan for the new seat</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setSelectedSeatPlan('STARTER')}
                                            className={`p-3 rounded-lg border-2 text-left transition-colors ${
                                                selectedSeatPlan === 'STARTER'
                                                    ? 'border-indigo-600 bg-indigo-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="text-sm font-bold text-slate-900">Starter</div>
                                            <div className="text-xs font-semibold text-indigo-600">₹4,999/mo</div>
                                            <div className="text-xs text-slate-500 mt-1">5 cases, 5 AI investigations</div>
                                        </button>
                                        <button
                                            onClick={() => setSelectedSeatPlan('PROFESSIONAL')}
                                            className={`p-3 rounded-lg border-2 text-left transition-colors ${
                                                selectedSeatPlan === 'PROFESSIONAL'
                                                    ? 'border-indigo-600 bg-indigo-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="text-sm font-bold text-slate-900">Professional</div>
                                            <div className="text-xs font-semibold text-indigo-600">₹8,999/mo</div>
                                            <div className="text-xs text-slate-500 mt-1">20 cases, 12 AI investigations</div>
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                        <p className="text-sm text-slate-600">
                                            <span className="font-semibold text-slate-800">
                                                ₹{selectedSeatPlan === 'PROFESSIONAL' ? '8,999' : '4,999'}/seat/month
                                            </span>
                                            {userEmail.endsWith('@harsh.com') && <span className="ml-2 text-xs text-amber-600 font-medium">(Bypass — no charge)</span>}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleAddSeats}
                                                disabled={updatingSeats}
                                                className="btn-gradient px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {updatingSeats ? 'Processing...' : 'Confirm'}
                                            </button>
                                            <button
                                                onClick={() => { setShowSeatUpgrade(false); setSelectedSeatPlan('STARTER'); }}
                                                className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Seat List (Admin Only) */}
                {userRole === 'ADMIN' && org.seats && org.seats.length > 0 && (
                    <div className="card-surface p-6 mb-8">
                        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                            <Shield className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
                            Seats ({org.seats.filter(s => s.status === 'ACTIVE').length} active)
                        </h3>
                        <div className="space-y-3">
                            {org.seats.filter(s => s.status === 'ACTIVE').map((seat) => (
                                <div key={seat._id} className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                            seat.plan === 'PROFESSIONAL'
                                                ? 'text-purple-700 bg-purple-100'
                                                : 'text-blue-700 bg-blue-100'
                                        }`}>
                                            {seat.plan}
                                        </span>
                                        <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                            {seat.assignedTo
                                                ? `${seat.assignedTo.firstName} ${seat.assignedTo.lastName}`
                                                : <span className="italic text-slate-400">Unassigned</span>
                                            }
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleCancelSeat(
                                            seat._id,
                                            seat.assignedTo ? `${seat.assignedTo.firstName} ${seat.assignedTo.lastName}` : null
                                        )}
                                        disabled={!!seat.assignedTo}
                                        title={seat.assignedTo ? 'Remove the member first' : 'Cancel this seat'}
                                        className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${seat.assignedTo ? 'text-red-400 bg-red-50 opacity-50 cursor-not-allowed' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                                    >
                                        <Trash2 className="h-3 w-3" /> Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Invite Form (Admin Only) */}
                {userRole === 'ADMIN' && (
                    <div className="card-surface p-6 mb-8">
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
                                style={{ borderColor: 'var(--color-surface-border)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-surface)', '--tw-ring-color': 'var(--color-accent-glow)' } as React.CSSProperties}
                                disabled={usedSeats >= totalSeats || inviting}
                            />
                            <button
                                type="submit"
                                disabled={usedSeats >= totalSeats || inviting || !inviteEmail.trim()}
                                className="btn-gradient px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {inviting ? 'Sending...' : 'Send Invite'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Pending Invitations (Admin Only) */}
                {userRole === 'ADMIN' && invitations.length > 0 && (
                    <div className="card-surface p-6 mb-8">
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
                                            <p className="font-medium text-slate-900">{inv.invitedEmail}</p>
                                            <p className="text-xs text-slate-500">
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

                {/* Members List */}
                <div className="card-surface p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        <Users className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
                        Firm Members ({members.length})
                    </h3>
                    <div className="space-y-3">
                        {members.map((member) => (
                            <div
                                key={member.userId._id}
                                className="flex items-center justify-between py-4 px-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                                         style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
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
                                        <div className="relative" ref={activeMenu === member.userId._id ? menuRef : null}>
                                            <button
                                                onClick={() => setActiveMenu(activeMenu === member.userId._id ? null : member.userId._id)}
                                                className="ml-2 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                                                title="Actions"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                            {activeMenu === member.userId._id && (
                                                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                                                    <button
                                                        onClick={() => {
                                                            setActiveMenu(null);
                                                            const name = `${member.userId.firstName} ${member.userId.lastName}`;
                                                            navigate(`/portal/cases?userId=${member.userId._id}&name=${encodeURIComponent(name)}`);
                                                        }}
                                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                    >
                                                        <Eye className="h-4 w-4 text-indigo-500" /> View Cases
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setActiveMenu(null);
                                                            handleRemoveMember(member.userId._id, `${member.userId.firstName} ${member.userId.lastName}`);
                                                        }}
                                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" /> Remove
                                                    </button>
                                                </div>
                                            )}
                                        </div>
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

                {/* Remove Member Confirmation */}
                <ConfirmationModal
                    isOpen={showRemoveConfirm}
                    onClose={() => { setShowRemoveConfirm(false); setMemberToRemove(null); }}
                    onConfirm={confirmRemoveMember}
                    title="Remove Member"
                    message={`Remove ${memberToRemove?.name || 'this member'} from the organization? They will lose portal access.`}
                    confirmText="Remove"
                    cancelText="Cancel"
                    type="danger"
                />

                {/* Cancel Seat Confirmation */}
                <ConfirmationModal
                    isOpen={showCancelSeatConfirm}
                    onClose={() => { setShowCancelSeatConfirm(false); setSeatToCancel(null); }}
                    onConfirm={confirmCancelSeat}
                    title="Cancel Seat"
                    message={
                        seatToCancel?.assignedName
                            ? `This will cancel the seat subscription and remove ${seatToCancel.assignedName} from the organization. Continue?`
                            : 'Cancel this seat subscription?'
                    }
                    confirmText={cancellingSeat ? 'Cancelling...' : 'Cancel Seat'}
                    cancelText="Keep"
                    type="danger"
                />
            </div>
        </PortalLayout>
    );
};

export default FirmConnect;
