import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { CheckCircle, X, Lock, ChevronDown, Sparkles, Shield, Zap, Mail, Building2 } from 'lucide-react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';


declare global {
    interface Window {
        Razorpay: any;
    }
}

const Pricing: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showWelcome, setShowWelcome] = useState(false);
    const [showAuthPopup, setShowAuthPopup] = useState(false);
    const [authPopupVisible, setAuthPopupVisible] = useState(false);
    const [authPopupRender, setAuthPopupRender] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    // Firm name modal state
    const [showFirmNameModal, setShowFirmNameModal] = useState(false);
    const [firmName, setFirmName] = useState('');
    const [pendingPlan, setPendingPlan] = useState<any>(null);

    React.useEffect(() => {
        if (location.state?.needsSubscription) {
            setShowWelcome(true);
        } else if (location.state?.error) {
            setError(location.state.error);
        }
    }, [location.state]);

    useEffect(() => {
        if (showAuthPopup) {
            setAuthPopupRender(true);
            setTimeout(() => setAuthPopupVisible(true), 10);
        } else {
            setAuthPopupVisible(false);
            const timer = setTimeout(() => setAuthPopupRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [showAuthPopup]);

    useEffect(() => {
        if (!showAuthPopup && !showFirmNameModal) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowAuthPopup(false);
                setShowFirmNameModal(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showAuthPopup, showFirmNameModal]);

    const plans = [
        {
            id: 'STARTER',
            name: 'Starter',
            description: 'Perfect for individual advocates starting their practice.',
            price: 4999,
            icon: <Zap className="w-6 h-6" />,
            roleLabel: 'ADVOCATE',
            features: [
                'Up to 5 active cases',
                '2 AI Investigations/mo',
                'Standard RAG (Graph + Vector)',
                'Individual use',
                'Basic Email Support'
            ],
            recommended: false,
            cta: 'Subscribe'
        },
        {
            id: 'PROFESSIONAL',
            name: 'Professional',
            description: 'For experienced advocates with heavy workloads.',
            price: 8999,
            icon: <Sparkles className="w-6 h-6" />,
            roleLabel: 'ADVOCATE',
            features: [
                'Up to 20 active cases',
                '10 AI Investigations/mo',
                'Advanced AI Research Tools',
                'Priority Support',
                'SOC2 Compliance'
            ],
            recommended: true,
            cta: 'Subscribe'
        },
        {
            id: 'FIRM',
            name: 'Firm',
            description: 'Full suite for law firms with team management.',
            price: 9999,
            icon: <Building2 className="w-6 h-6" />,
            roleLabel: 'ADMIN',
            features: [
                'Unlimited cases',
                'Unlimited AI Investigations',
                'Organization management',
                'Buy per-member seats',
                'Priority Support'
            ],
            recommended: false,
            cta: 'Subscribe'
        }
    ];

    const faqs = [
        {
            q: 'Is my client data secure and private?',
            a: 'Yes, we use bank-grade AES-256 encryption. We are SOC2 Type II compliant and our AI models are private, meaning your firm\'s data is never used to train global models.'
        },
        {
            q: 'Can I switch plans later?',
            a: 'Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle, and we\'ll prorate any differences.'
        },
        {
            q: 'What happens after I subscribe?',
            a: 'You get instant access to the portal. Starter and Professional plans give you an individual ADVOCATE account. The Firm plan makes you an ADMIN and lets you manage a team with per-member seats.'
        },
        {
            q: 'How do Firm seats work?',
            a: 'After subscribing to the Firm plan, you can buy additional seats for team members. Each seat is a separate monthly subscription (Starter or Professional tier) that you can assign to invited members.'
        }
    ];

    const proceedWithPayment = async (plan: any, orgName?: string) => {
        try {
            setLoading(true);
            setError(null);

            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = user?.token;

            if (!token) {
                setShowAuthPopup(true);
                setLoading(false);
                return;
            }

            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
            const authHeader = { headers: { Authorization: `Bearer ${token}` } };

            // Dev bypass for @harsh.com
            if (user.email && user.email.endsWith('@harsh.com')) {
                const { data } = await axios.post(
                    `${apiUrl}/payments/test-activate`,
                    { planId: plan.id, firmName: orgName || `${user.firstName}'s Law Firm` },
                    authHeader
                );

                if (data.success) {
                    Object.assign(user, data.user);
                    localStorage.setItem('user', JSON.stringify(user));
                    navigate('/portal');
                } else {
                    setError('Activation failed');
                }
                return;
            }

            // Create Razorpay subscription
            const { data: subData } = await axios.post(
                `${apiUrl}/payments/create-subscription`,
                { planId: plan.id },
                authHeader
            );
            if (!subData.success) {
                setError('Failed to initiate subscription');
                setLoading(false);
                return;
            }

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                subscription_id: subData.subscriptionId,
                name: "LawFirmAI",
                description: `${plan.name} Plan – ₹${plan.price.toLocaleString()}/mo`,
                handler: async function (response: any) {
                    try {
                        const verifyRes = await axios.post(
                            `${apiUrl}/payments/verify-subscription`,
                            {
                                razorpay_subscription_id: response.razorpay_subscription_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                planId: plan.id,
                                firmName: orgName
                            },
                            authHeader
                        );
                        if (verifyRes.data.success) {
                            Object.assign(user, verifyRes.data.user);
                            localStorage.setItem('user', JSON.stringify(user));
                            navigate('/portal');
                        } else {
                            setError('Payment verification failed');
                        }
                    } catch {
                        setError('Payment verification failed');
                    } finally {
                        setLoading(false);
                    }
                },
                prefill: { name: `${user.firstName} ${user.lastName || ''}`.trim(), email: user.email },
                theme: { color: "#4F46E5" },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                    }
                }
            };
            const rzp1 = new window.Razorpay(options);
            rzp1.open();

        } catch (error) {
            console.error('Payment Error:', error);
            setError('Something went wrong during payment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (plan: any) => {
        // For Firm plan, show firm name modal first
        if (plan.id === 'FIRM') {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            if (!user?.token) {
                setShowAuthPopup(true);
                return;
            }
            setPendingPlan(plan);
            setFirmName(`${user.firstName}'s Law Firm`);
            setShowFirmNameModal(true);
            return;
        }

        await proceedWithPayment(plan);
    };

    const handleFirmNameSubmit = async () => {
        if (!firmName.trim()) return;
        setShowFirmNameModal(false);
        await proceedWithPayment(pendingPlan, firmName.trim());
    };

    const renderCategory = (label: string) => (
        <tr>
            <td colSpan={4} className="pt-6 pb-3 px-6">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
                    {label}
                </span>
            </td>
        </tr>
    );

    const renderCell = (val: boolean | string) => {
        if (val === true) {
            return <CheckCircle className="w-5 h-5 mx-auto" style={{ color: '#10b981' }} />;
        }
        if (val === false) {
            return <span className="text-base" style={{ color: 'var(--color-text-tertiary)' }}>—</span>;
        }
        return <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{val}</span>;
    };

    const renderRow = (feature: string, starter: boolean | string, pro: boolean | string, firm: boolean | string) => (
        <tr style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
            <td className="py-4 px-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{feature}</td>
            <td className="py-4 px-4 text-center">{renderCell(starter)}</td>
            <td className="py-4 px-4 text-center" style={{ backgroundColor: 'var(--color-accent-glow)' }}>{renderCell(pro)}</td>
            <td className="py-4 px-4 text-center">{renderCell(firm)}</td>
        </tr>
    );

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
            <Navbar />

            <div className="flex-grow pt-28 pb-20 px-4 sm:px-6 lg:px-8">
                {/* Welcome banner */}
                {showWelcome && (
                    <div className="max-w-3xl mx-auto mb-10 relative overflow-hidden rounded-2xl" style={{ boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-surface-border)' }}>
                        <div className="absolute inset-0" style={{ background: 'var(--gradient-hero-bg)' }}></div>
                        <div className="absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-1/2 translate-x-1/2 opacity-30" style={{ backgroundColor: 'var(--color-accent-glow)' }}></div>
                        <button
                            onClick={() => setShowWelcome(false)}
                            className="absolute top-4 right-4 z-10 p-1.5 rounded-full transition-all"
                            style={{ color: 'var(--color-text-tertiary)' }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="relative px-8 py-8 flex flex-col items-center text-center">

                            <h3 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                You're almost there!
                            </h3>
                            <p className="mt-3 text-base max-w-lg leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                Your account is all set up. Choose a plan below to unlock the full power of <strong>LawFirmAI</strong>.
                            </p>
                            <div className="mt-4 flex items-center gap-6 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Cancel anytime
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Instant access
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Secure payments
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error banner */}
                {error && !showWelcome && (
                    <div className="max-w-3xl mx-auto mb-8 bg-red-500/10 border border-red-500/20 p-4 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                            <p className="flex-1 text-sm font-medium text-red-500">{error}</p>
                            <button onClick={() => setError(null)} className="p-1 rounded-full text-red-400 hover:text-red-600 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Header Section */}
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <div className="badge-glow mx-auto w-fit mb-6">
                        <Sparkles className="w-4 h-4" />
                        PRICING & PLANS
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5" style={{ color: 'var(--color-text-primary)' }}>
                        Simple, <span className="text-gradient">Transparent</span> Pricing
                    </h1>
                    <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
                        Unlock the power of artificial intelligence for your legal practice. Scale from solo advocate to full firm with ease.
                    </p>
                </div>

                {/* 3-Tier Pricing Grid */}
                <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-3 mb-24">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative rounded-2xl flex flex-col transition-all duration-300 hover:-translate-y-1 ${plan.recommended ? 'lg:-mt-4 lg:mb-4' : ''}`}
                            style={{
                                backgroundColor: plan.recommended ? 'transparent' : 'var(--color-surface)',
                                background: plan.recommended ? 'var(--gradient-accent)' : undefined,
                                border: plan.recommended ? 'none' : '1px solid var(--color-surface-border)',
                                boxShadow: plan.recommended ? '0 20px 60px rgba(79, 70, 229, 0.3)' : 'var(--shadow-md)',
                            }}
                        >
                            {plan.recommended && (
                                <div className="absolute top-0 right-4 -translate-y-1/2">
                                    <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400 text-gray-900 shadow-lg">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <div className={`p-8 flex flex-col flex-1 ${plan.recommended ? 'text-white' : ''}`}>
                                {/* Plan Icon + Name */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                                        backgroundColor: plan.recommended ? 'rgba(255,255,255,0.2)' : 'var(--color-accent-soft)',
                                        color: plan.recommended ? 'white' : 'var(--color-accent)'
                                    }}>
                                        {plan.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">{plan.name}</h3>
                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{
                                            color: plan.recommended ? 'rgba(255,255,255,0.6)' : 'var(--color-text-tertiary)'
                                        }}>
                                            {plan.roleLabel} account
                                        </span>
                                    </div>
                                </div>

                                <p className="text-sm mb-6" style={{ color: plan.recommended ? 'rgba(255,255,255,0.8)' : 'var(--color-text-secondary)' }}>
                                    {plan.description}
                                </p>

                                {/* Price */}
                                <div className="flex items-baseline mb-8">
                                    <span className="text-4xl font-extrabold tracking-tight">₹{plan.price.toLocaleString()}</span>
                                    <span className="ml-1 text-base font-medium" style={{ color: plan.recommended ? 'rgba(255,255,255,0.7)' : 'var(--color-text-tertiary)' }}>
                                        {t('pricing.perMonth')}
                                    </span>
                                </div>

                                {/* Features */}
                                <ul className="space-y-3.5 flex-1 mb-8">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <CheckCircle className="flex-shrink-0 h-5 w-5 mt-0.5" style={{
                                                color: plan.recommended ? 'rgba(255,255,255,0.9)' : '#10b981'
                                            }} />
                                            <span className="text-sm" style={{ color: plan.recommended ? 'rgba(255,255,255,0.9)' : 'var(--color-text-secondary)' }}>
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <button
                                    onClick={() => handleSubscribe(plan)}
                                    disabled={loading}
                                    className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all ${
                                        loading ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'
                                    }`}
                                    style={plan.recommended ? {
                                        backgroundColor: 'white',
                                        color: '#4F46E5',
                                    } : plan.id === 'FIRM' ? {
                                        background: 'var(--gradient-accent)',
                                        color: 'white',
                                    } : {
                                        backgroundColor: 'var(--color-bg-tertiary)',
                                        color: 'var(--color-text-primary)',
                                        border: '1px solid var(--color-surface-border)',
                                    }}
                                >
                                    {loading ? t('pricing.processing') : plan.cta}
                                </button>

                                <p className="text-center text-xs mt-3" style={{ color: plan.recommended ? 'rgba(255,255,255,0.6)' : 'var(--color-text-tertiary)' }}>
                                    Monthly billing • Cancel anytime
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Feature Comparison Table */}
                <div className="max-w-5xl mx-auto mb-24">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold tracking-tight mb-3" style={{ color: 'var(--color-text-primary)' }}>
                            Compare <span className="text-gradient">Features</span>
                        </h2>
                        <p className="text-base" style={{ color: 'var(--color-text-secondary)' }}>
                            See exactly what's included in each plan.
                        </p>
                    </div>

                    <div className="rounded-2xl overflow-hidden" style={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-surface-border)',
                        boxShadow: 'var(--shadow-lg)'
                    }}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
                                        <th className="text-left py-5 px-6 font-bold text-sm" style={{ color: 'var(--color-text-primary)', minWidth: '220px' }}>
                                            Features
                                        </th>
                                        {['Starter', 'Professional', 'Firm'].map((name, i) => (
                                            <th key={name} className="text-center py-5 px-4 font-bold text-sm" style={{
                                                color: i === 1 ? 'var(--color-accent)' : 'var(--color-text-primary)',
                                                minWidth: '140px'
                                            }}>
                                                <div className="flex flex-col items-center gap-1">
                                                    <span>{name}</span>
                                                    {i === 1 && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-gray-900">Popular</span>
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {renderCategory('Core Features')}
                                    {renderRow('Active Cases', '5', '20', 'Unlimited')}
                                    {renderRow('Document Storage', '5 GB', '50 GB', 'Unlimited')}
                                    {renderRow('Case Management', true, true, true)}
                                    {renderRow('Client Communication', true, true, true)}
                                    {renderRow('Role', 'Advocate', 'Advocate', 'Admin')}
                                    {renderRow('Organization Management', false, false, true)}
                                    {renderRow('Team Seats', false, false, 'Buy per-member')}

                                    {renderCategory('AI & Intelligence')}
                                    {renderRow('AI Investigations/mo', '2', '10', 'Unlimited')}
                                    {renderRow('AI Document Review', 'Basic', 'Advanced', 'Advanced')}
                                    {renderRow('RAG (Graph + Vector)', 'Standard', 'Standard', 'Standard')}
                                    {renderRow('AI Legal Research', false, true, true)}
                                    {renderRow('AI Document Drafting', false, true, true)}

                                    {renderCategory('Security & Compliance')}
                                    {renderRow('Data Encryption', 'AES-256', 'AES-256', 'AES-256')}
                                    {renderRow('SOC2 Compliance', false, true, true)}
                                    {renderRow('Audit Logs', false, true, true)}

                                    {renderCategory('Support & Services')}
                                    {renderRow('Email Support', true, true, true)}
                                    {renderRow('Priority Support', false, true, true)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="max-w-3xl mx-auto mb-24">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold tracking-tight mb-3" style={{ color: 'var(--color-text-primary)' }}>
                            Frequently Asked Questions
                        </h2>
                        <p className="text-base" style={{ color: 'var(--color-text-secondary)' }}>
                            Everything you need to know about our plans and pricing.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {faqs.map((faq, i) => (
                            <div
                                key={i}
                                className="rounded-xl overflow-hidden transition-all"
                                style={{
                                    backgroundColor: 'var(--color-surface)',
                                    border: '1px solid var(--color-surface-border)',
                                }}
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                                >
                                    <span className="font-semibold text-sm pr-4" style={{ color: 'var(--color-text-primary)' }}>
                                        {faq.q}
                                    </span>
                                    <ChevronDown
                                        className="w-5 h-5 flex-shrink-0 transition-transform duration-300"
                                        style={{
                                            color: 'var(--color-text-tertiary)',
                                            transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)'
                                        }}
                                    />
                                </button>
                                <div
                                    className="overflow-hidden transition-all duration-300"
                                    style={{
                                        maxHeight: openFaq === i ? '200px' : '0px',
                                        opacity: openFaq === i ? 1 : 0,
                                    }}
                                >
                                    <p className="px-6 pb-5 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                        {faq.a}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Still have questions? CTA */}
                <div className="max-w-3xl mx-auto">
                    <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--gradient-accent)' }}>
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-5">
                            <Mail className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">Still have questions?</h3>
                        <p className="text-white/80 mb-6 max-w-md mx-auto text-sm">
                            Our team of legal tech experts is ready to help you find the perfect plan for your practice.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <a
                                href="mailto:sales@lawfirmai.com"
                                className="px-6 py-3 rounded-xl bg-white font-bold text-sm transition-all hover:-translate-y-0.5"
                                style={{ color: '#4F46E5' }}
                            >
                                Contact Sales
                            </a>
                            <button
                                className="px-6 py-3 rounded-xl font-bold text-sm text-white border border-white/30 transition-all hover:bg-white/10"
                            >
                                Schedule a Demo
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Firm Name Modal */}
            {showFirmNameModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        onClick={() => setShowFirmNameModal(false)}
                        className="absolute inset-0 backdrop-blur-sm bg-black/40"
                    />
                    <div
                        className="relative rounded-2xl shadow-2xl p-8 max-w-sm w-full"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)' }}
                    >
                        <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center shadow-md mb-5" style={{ background: 'var(--gradient-accent)' }}>
                            <Building2 className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-center" style={{ color: 'var(--color-text-primary)' }}>Name your firm</h3>
                        <p className="mt-2 text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
                            This will be your organization name on the platform.
                        </p>
                        <input
                            type="text"
                            value={firmName}
                            onChange={(e) => setFirmName(e.target.value)}
                            className="mt-4 w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
                            style={{
                                backgroundColor: 'var(--color-bg-tertiary)',
                                border: '1px solid var(--color-surface-border)',
                                color: 'var(--color-text-primary)',
                            }}
                            placeholder="e.g. Sharma & Associates"
                            onKeyDown={(e) => e.key === 'Enter' && handleFirmNameSubmit()}
                            autoFocus
                        />
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setShowFirmNameModal(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                                style={{
                                    backgroundColor: 'var(--color-bg-tertiary)',
                                    color: 'var(--color-text-primary)',
                                    border: '1px solid var(--color-surface-border)'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFirmNameSubmit}
                                disabled={!firmName.trim()}
                                className="flex-1 btn-gradient disabled:opacity-50"
                            >
                                Continue to Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Auth popup for unauthenticated users */}
            {authPopupRender && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        onClick={() => setShowAuthPopup(false)}
                        className={`absolute inset-0 backdrop-blur-sm transition-all duration-300 ease-out cursor-pointer ${
                            authPopupVisible ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                    />
                    <div
                        className={`relative rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center transition-all duration-300 ease-out ${
                            authPopupVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
                        }`}
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)' }}
                    >
                        <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center shadow-md mb-5 transition-all duration-300 ${
                            authPopupVisible ? 'scale-100 rotate-0' : 'scale-75 rotate-12'
                        }`} style={{ background: 'var(--gradient-accent)' }}>
                            <Lock className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Sign in to continue</h3>
                        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            Create an account or sign in to subscribe to a plan.
                        </p>
                        <div className="mt-6 flex flex-col gap-3">
                            <button
                                onClick={() => navigate('/signup', { state: { from: '/pricing' } })}
                                className="btn-gradient w-full"
                            >
                                Sign Up
                            </button>
                            <button
                                onClick={() => navigate('/signin', { state: { from: { pathname: '/pricing' } } })}
                                className="btn-ghost w-full"
                            >
                                Sign In
                            </button>
                        </div>
                        <button
                            onClick={() => setShowAuthPopup(false)}
                            className="mt-4 text-sm transition-colors"
                            style={{ color: 'var(--color-text-tertiary)' }}
                        >
                            Browse Plans
                        </button>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default Pricing;
