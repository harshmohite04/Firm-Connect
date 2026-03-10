import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken, getAuthData } from '../../utils/storage';
import ConfirmationModal from '../../components/ConfirmationModal';
import axios from 'axios';

declare global {
    interface Window {
        Razorpay: any;
    }
}

const CheckIcon = () => (
    <svg className="flex-shrink-0 h-5 w-5 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const plans = [
    {
        id: 'STARTER',
        name: 'Starter',
        price: 4999,
        description: 'Perfect for individual advocates starting their practice.',
        features: [
            '5 cases/month',
            '3 AI Investigations/mo',
            '150 AskAI messages',
            '5 document drafts',
            '100 OCR pages'
        ]
    },
    {
        id: 'PROFESSIONAL',
        name: 'Professional',
        price: 8999,
        description: 'For experienced advocates with heavy workloads.',
        features: [
            '20 cases/month',
            '8 AI Investigations/mo',
            '300 AskAI messages',
            '15 document drafts',
            '500 OCR pages'
        ],
        recommended: true
    },
    {
        id: 'FIRM',
        name: 'Firm',
        price: 9999,
        description: 'Full suite for law firms with team management.',
        features: [
            '20 cases/month',
            '8 AI Investigations/mo',
            'Admin Dashboard',
            'Add team seats (from ₹4,999/seat)',
            'Organization management',
            'Priority Support'
        ]
    }
];

const PLAN_HIERARCHY: Record<string, number> = {
    FREE_TRIAL: 0,
    STARTER: 1,
    PROFESSIONAL: 2,
    FIRM: 3
};

const ProfileSubscription: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmText: string;
        isDanger?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        confirmText: 'Confirm',
        isDanger: false
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = getAuthToken();
                if (!token) return;
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const { data } = await axios.get(`${apiUrl}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUser(data.user || data);
            } catch {
                const stored = getAuthData() as any;
                if (stored) setUser(stored);
            }
        };
        fetchUser();
    }, []);

    const currentPlan = user?.subscriptionPlan || 'FREE_TRIAL';
    const currentStatus = user?.subscriptionStatus || 'INACTIVE';
    const expiresAt = user?.subscriptionExpiresAt;

    const statusColor = currentStatus === 'ACTIVE'
        ? '#10b981'
        : currentStatus === 'EXPIRED' ? '#ef4444' : '#f59e0b';

    const statusLabel = currentStatus === 'ACTIVE'
        ? 'Active'
        : currentStatus === 'EXPIRED' ? 'Expired' : 'Inactive';

    const planDisplayName = (plan: string) => {
        switch (plan) {
            case 'FREE_TRIAL': return 'Free Trial';
            case 'STARTER': return 'Starter';
            case 'PROFESSIONAL': return 'Professional';
            case 'FIRM': return 'Firm';
            default: return plan;
        }
    };

    const getButtonConfig = (planId: string) => {
        if (planId === 'FIRM') {
            return currentPlan === 'FIRM'
                ? { label: 'Current Plan', disabled: true, action: 'current' }
                : { label: 'Contact Support', disabled: false, action: 'contact' };
        }

        const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0;
        const targetLevel = PLAN_HIERARCHY[planId] ?? 0;

        if (currentPlan === 'FIRM') {
            return { label: '', disabled: true, action: 'hidden' };
        }

        if (planId === currentPlan) {
            return { label: 'Current Plan', disabled: true, action: 'current' };
        }

        if (currentLevel === 0) {
            return { label: 'Subscribe', disabled: false, action: 'subscribe' };
        }

        if (targetLevel > currentLevel) {
            return { label: 'Upgrade', disabled: false, action: 'upgrade' };
        }

        return { label: 'Downgrade', disabled: false, action: 'downgrade' };
    };

    const handlePlanChange = async (planId: string) => {
        try {
            setLoading(true);
            setError(null);

            const token = getAuthToken();
            if (!token) return;

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const authHeader = { headers: { Authorization: `Bearer ${token}` } };

            // Call change-plan, get subscriptionId, open Razorpay
            const { data } = await axios.post(
                `${apiUrl}/payments/change-plan`,
                { newPlanId: planId },
                authHeader
            );

            if (!data.success) {
                setError(data.message || 'Failed to change plan');
                return;
            }

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                subscription_id: data.subscriptionId,
                name: 'LawFirmAI',
                image: '/logo.svg',
                description: `Switch to ${planId} Plan`,
                redirect: true,
                callback_url: `${apiUrl}/payments/verify-subscription-redirect`,
                prefill: {
                    name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
                    email: user?.email || ''
                },
                theme: { color: '#4F46E5' }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err: any) {
            console.error('Plan change error:', err);
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (planId: string, action: string) => {
        if (action === 'contact') {
            navigate('/contact');
            return;
        }

        if (action === 'downgrade') {
            setConfirmation({
                isOpen: true,
                title: 'Downgrade Plan',
                message: `You'll lose access to Professional features when you downgrade to Starter. Your current billing cycle will be cancelled and a new one will begin. Continue?`,
                confirmText: 'Yes, Downgrade',
                isDanger: true,
                onConfirm: () => {
                    setConfirmation(prev => ({ ...prev, isOpen: false }));
                    handlePlanChange(planId);
                }
            });
            return;
        }

        // subscribe or upgrade
        handlePlanChange(planId);
    };

    if (!user) {
        return (
            <div className="card-surface p-8 text-center">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 rounded w-1/3 mx-auto" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
                    <div className="h-4 rounded w-2/3 mx-auto" style={{ backgroundColor: 'var(--color-bg-tertiary)' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Error Banner */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-red-500">{error}</p>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                    </div>
                </div>
            )}

            {/* Current Plan Card */}
            <div className="card-surface p-6">
                <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                    Current Subscription
                </h2>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                          style={{ background: 'var(--gradient-accent)', color: 'white' }}>
                        {planDisplayName(currentPlan)}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                        {statusLabel}
                    </span>
                </div>
                <div className="space-y-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {expiresAt && (
                        <p>Renewal: <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span></p>
                    )}
                    <p>Role: <span className="font-medium capitalize" style={{ color: 'var(--color-text-primary)' }}>
                        {user.role === 'ADMIN' ? 'Admin' : 'Advocate'}
                    </span></p>
                </div>
            </div>

            {/* Plan Cards */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    Available Plans
                </h2>

                {plans.map((plan) => {
                    const btn = getButtonConfig(plan.id);
                    if (btn.action === 'hidden') return null;

                    const isCurrent = btn.action === 'current';

                    return (
                        <div
                            key={plan.id}
                            className="card-surface p-5 transition-all"
                            style={{
                                border: isCurrent
                                    ? '2px solid var(--color-accent)'
                                    : '1px solid var(--color-surface-border)',
                            }}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                            {plan.name}
                                        </h3>
                                        {plan.recommended && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-gray-900">
                                                Popular
                                            </span>
                                        )}
                                        {isCurrent && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                                  style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                                        {plan.description}
                                    </p>
                                    <div className="flex items-baseline gap-1 mb-3">
                                        <span className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                                            ₹{plan.price.toLocaleString()}
                                        </span>
                                        <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>/mo</span>
                                    </div>
                                    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                                <CheckIcon /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="sm:flex-shrink-0">
                                    <button
                                        onClick={() => handleAction(plan.id, btn.action)}
                                        disabled={btn.disabled || loading}
                                        className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                            btn.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'
                                        }`}
                                        style={
                                            btn.action === 'upgrade' || btn.action === 'subscribe'
                                                ? { background: 'var(--gradient-accent)', color: 'white' }
                                                : btn.action === 'downgrade'
                                                ? { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-surface-border)' }
                                                : btn.action === 'contact'
                                                ? { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-surface-border)' }
                                                : { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }
                                        }
                                    >
                                        {loading ? 'Processing...' : btn.label}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <ConfirmationModal
                isOpen={confirmation.isOpen}
                onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmation.onConfirm}
                title={confirmation.title}
                message={confirmation.message}
                confirmText={confirmation.confirmText}
                isDanger={confirmation.isDanger}
            />
        </div>
    );
};

export default ProfileSubscription;
