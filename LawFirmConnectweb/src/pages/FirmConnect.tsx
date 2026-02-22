import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '../components/PortalLayout';
import organizationService from '../services/organizationService';
import type { Organization, OrganizationMember, Invitation } from '../services/organizationService';
import toast from 'react-hot-toast';
import axios from 'axios';
import { UserPlus, Users, Mail, Clock, CheckCircle, Building2, Crown, Shield, Trash2, MoreVertical, Eye } from 'lucide-react';
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
    const [seatCount, setSeatCount] = useState(1);
    const [updatingSeats, setUpdatingSeats] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
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

    const handleAddSeats = async () => {
        try {
            setUpdatingSeats(true);

            // @harsh.com users bypass payment
            if (userEmail.endsWith('@harsh.com')) {
                const result = await organizationService.updateSeats(seatCount);
                toast.success(result.message);
                setShowSeatUpgrade(false);
                setSeatCount(1);
                fetchData();
                return;
            }

            // All other users go through Razorpay payment
            const pricePerSeat = org?.plan === 'STARTER' ? 299 : 499;
            const totalAmount = pricePerSeat * seatCount;

            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = user?.token;
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const authHeader = { headers: { Authorization: `Bearer ${token}` } };

            // Create Razorpay order
            const { data: orderData } = await axios.post(
                `${apiUrl}/payments/create-order`,
                { planId: org?.plan || 'PROFESSIONAL', amount: totalAmount },
                authHeader
            );

            if (!orderData.success) {
                toast.error('Failed to initiate payment');
                setUpdatingSeats(false);
                return;
            }

            // Open Razorpay checkout
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: orderData.order.amount,
                currency: 'INR',
                name: 'LawFirmAI',
                description: `Add ${seatCount} seat(s) to your plan`,
                order_id: orderData.order.id,
                handler: async function (response: any) {
                    try {
                        // Use the payment_id from Razorpay to verify on backend
                        const result = await organizationService.updateSeats(
                            seatCount,
                            response.razorpay_payment_id
                        );
                        toast.success(result.message);
                        setShowSeatUpgrade(false);
                        setSeatCount(1);
                        fetchData();
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
            toast.error(error?.response?.data?.message || 'Failed to update seats');
        } finally {
            setUpdatingSeats(false);
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
                            All seats are filled. Add more seats to invite new members.
                        </p>
                    )}
                    {userRole === 'ADMIN' && (
                        <div className="mt-4">
                            {!showSeatUpgrade ? (
                                <button
                                    onClick={() => setShowSeatUpgrade(true)}
                                    className="px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
                                >
                                    + Add Seats
                                </button>
                            ) : (
                                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <label className="text-sm font-medium text-slate-700">Seats to add:</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={50 - totalSeats}
                                            value={seatCount}
                                            onChange={(e) => setSeatCount(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-semibold"
                                        />
                                        <span className="text-sm text-slate-500">
                                            New total: {totalSeats + seatCount} seats
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-slate-600">
                                            <span className="font-semibold text-slate-800">
                                                ₹{org.plan === 'STARTER' ? 299 : 499}/seat/month
                                            </span>
                                            {' · '}Total: <span className="font-bold text-indigo-700">₹{(org.plan === 'STARTER' ? 299 : 499) * seatCount}/month</span>
                                            {userEmail.endsWith('@harsh.com') && <span className="ml-2 text-xs text-amber-600 font-medium">(Bypass — no charge)</span>}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleAddSeats}
                                                disabled={updatingSeats}
                                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 transition-colors"
                                            >
                                                {updatingSeats ? 'Processing...' : 'Confirm'}
                                            </button>
                                            <button
                                                onClick={() => { setShowSeatUpgrade(false); setSeatCount(1); }}
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
            </div>
        </PortalLayout>
    );
};

export default FirmConnect;
