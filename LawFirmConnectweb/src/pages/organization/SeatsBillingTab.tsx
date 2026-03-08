import React, { useState } from 'react';
import { Shield, Trash2 } from 'lucide-react';
import organizationService from '../../services/organizationService';
import type { Organization } from '../../services/organizationService';
import ConfirmationModal from '../../components/ConfirmationModal';
import toast from 'react-hot-toast';
import axios from 'axios';

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface SeatsBillingTabProps {
    org: Organization;
    totalSeats: number;
    usedSeats: number;
    onRefresh: () => void;
}

const SeatsBillingTab: React.FC<SeatsBillingTabProps> = ({ org, totalSeats, usedSeats, onRefresh }) => {
    const [showSeatUpgrade, setShowSeatUpgrade] = useState(false);
    const [selectedSeatPlan, setSelectedSeatPlan] = useState<'STARTER' | 'PROFESSIONAL'>('STARTER');
    const [updatingSeats, setUpdatingSeats] = useState(false);
    const [showCancelSeatConfirm, setShowCancelSeatConfirm] = useState(false);
    const [seatToCancel, setSeatToCancel] = useState<{ id: string; assignedName: string | null } | null>(null);
    const [cancellingSeat, setCancellingSeat] = useState(false);

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userEmail = user?.email || '';

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
            onRefresh();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to cancel seat');
        } finally {
            setCancellingSeat(false);
            setSeatToCancel(null);
            setShowCancelSeatConfirm(false);
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
                onRefresh();
                return;
            }

            const token = user?.token;
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const authHeader = { headers: { Authorization: `Bearer ${token}` } };

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
                description: `${selectedSeatPlan} Seat - ${seatPrice}/mo`,
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
                            onRefresh();
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
            return;

        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to purchase seat');
        } finally {
            setUpdatingSeats(false);
        }
    };

    const activeSeats = org.seats?.filter(s => s.status === 'ACTIVE') || [];

    return (
        <div className="space-y-6">
            {/* Seat List */}
            <div className="card-surface p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <Shield className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
                    Active Seats ({activeSeats.length})
                </h3>

                {activeSeats.length === 0 ? (
                    <p className="text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>
                        No seats purchased yet. Add a seat to invite members.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {activeSeats.map((seat) => (
                            <div key={seat._id} className="flex items-center justify-between py-3 px-4 rounded-xl border" style={{ borderColor: 'var(--color-surface-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
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
                                            : <span className="italic" style={{ color: 'var(--color-text-tertiary)' }}>Unassigned</span>
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
                                    className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                                        seat.assignedTo
                                            ? 'text-red-400 bg-red-50 opacity-50 cursor-not-allowed'
                                            : 'text-red-600 bg-red-50 hover:bg-red-100'
                                    }`}
                                >
                                    <Trash2 className="h-3 w-3" /> Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Seat Section */}
            <div className="card-surface p-6">
                <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Add a Seat</h3>

                {!showSeatUpgrade ? (
                    <button
                        onClick={() => setShowSeatUpgrade(true)}
                        className="btn-ghost px-4 py-2 text-sm font-semibold rounded-xl"
                    >
                        + Add Seat
                    </button>
                ) : (
                    <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--color-accent-soft)', backgroundColor: 'var(--color-accent-soft)' }}>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Select plan for the new seat</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setSelectedSeatPlan('STARTER')}
                                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                                    selectedSeatPlan === 'STARTER'
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <div className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Starter</div>
                                <div className="text-xs font-semibold text-indigo-600">₹4,999/mo</div>
                                <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>5 cases, 5 AI investigations</div>
                            </button>
                            <button
                                onClick={() => setSelectedSeatPlan('PROFESSIONAL')}
                                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                                    selectedSeatPlan === 'PROFESSIONAL'
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <div className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Professional</div>
                                <div className="text-xs font-semibold text-indigo-600">₹8,999/mo</div>
                                <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>20 cases, 12 AI investigations</div>
                            </button>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                    ₹{selectedSeatPlan === 'PROFESSIONAL' ? '8,999' : '4,999'}/seat/month
                                </span>
                                {userEmail.endsWith('@harsh.com') && <span className="ml-2 text-xs text-amber-600 font-medium">(Bypass - no charge)</span>}
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
                                    className="px-3 py-2 text-sm transition-colors"
                                    style={{ color: 'var(--color-text-tertiary)' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

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
    );
};

export default SeatsBillingTab;
