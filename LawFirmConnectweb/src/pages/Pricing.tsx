import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { CheckCircle, Rocket, X } from 'lucide-react';
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

    React.useEffect(() => {
        if (location.state?.needsSubscription) {
            setShowWelcome(true);
        } else if (location.state?.error) {
            setError(location.state.error);
        }
    }, [location.state]);

    // Hardcoded for now, should come from API/Env
    const plans = [
        {
            id: 'STARTER',
            name: 'Starter',
            price: 9999,
            features: [
                '5 Active Cases (Shared)',
                '2 AI Investigations/mo',
                'Standard RAG (Graph + Vector)',
                '2 User Seats',
                'Basic Email Support'
            ],
            recommended: false
        },
        {
            id: 'PROFESSIONAL',
            name: 'Professional',
            price: 24999,
            features: [
                '20 Active Cases (Shared)',
                '10 AI Investigations/mo',
                'Standard RAG (Graph + Vector)',
                '5 User Seats',
                'Priority Support'
            ],
            recommended: true
        }
    ];

    const handleSubscribe = async (plan: any) => {
        try {
            setLoading(true);
            setError(null);

            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = user?.token;

            if (!token) {
                navigate('/signin', { state: { from: { pathname: '/pricing' } } });
                return;
            }

            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
            const authHeader = { headers: { Authorization: `Bearer ${token}` } };

            // @harsh.com users bypass payment
            if (user.email && user.email.endsWith('@harsh.com')) {
                const { data } = await axios.post(
                    `${apiUrl}/payments/test-activate`,
                    { planId: plan.id, firmName: `${user.firstName}'s Law Firm` },
                    authHeader
                );

                if (data.success) {
                    user.role = data.user.role;
                    user.organizationId = data.user.organizationId;
                    user.subscriptionStatus = data.user.subscriptionStatus;
                    localStorage.setItem('user', JSON.stringify(user));
                    navigate('/portal');
                } else {
                    setError('Activation failed');
                }
                return;
            }

            // All other users go through Razorpay payment
            const { data: orderData } = await axios.post(
                `${apiUrl}/payments/create-order`,
                { planId: plan.id, amount: plan.price },
                authHeader
            );
            if (!orderData.success) { setError('Failed to initiate payment'); setLoading(false); return; }

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: orderData.order.amount,
                currency: "INR",
                name: "LawfirmAI",
                description: `Subscription for ${plan.name} Plan`,
                order_id: orderData.order.id,
                handler: async function (response: any) {
                    try {
                        const verifyRes = await axios.post(
                            `${apiUrl}/payments/verify`,
                            { ...response, planId: plan.id, firmName: `${user.firstName}'s Law Firm` },
                            authHeader
                        );
                        if (verifyRes.data.success) {
                            user.role = 'ADMIN';
                            user.subscriptionStatus = 'ACTIVE';
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
            return; // loading will be cleared by handler or ondismiss

        } catch (error) {
            console.error('Payment Error:', error);
            setError('Something went wrong during payment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            
            <div className="flex-grow pt-24 pb-12 px-4 sm:px-6 lg:px-8">
                {/* Conversion-focused welcome banner for redirected users */}
                {showWelcome && (
                    <div className="max-w-3xl mx-auto mb-10 relative overflow-hidden rounded-2xl shadow-lg border border-indigo-100">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-40"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-100 rounded-full translate-y-1/2 -translate-x-1/2 opacity-40"></div>
                        <button
                            onClick={() => setShowWelcome(false)}
                            className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="relative px-8 py-8 flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md mb-5">
                                <Rocket className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                You're almost there! 🎉
                            </h3>
                            <p className="mt-3 text-base text-slate-600 max-w-lg leading-relaxed">
                                Your account is all set up. Choose a plan below to unlock the full power of <strong>LawfirmAI</strong> — AI-driven investigations, secure case management, and more.
                            </p>
                            <div className="mt-4 flex items-center gap-6 text-xs text-slate-500">
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

                {/* Actual error banner (for payment failures, etc.) */}
                {error && !showWelcome && (
                    <div className="max-w-3xl mx-auto mb-8 bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                <svg className="h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="flex-1 text-sm font-medium text-red-800">{error}</p>
                            <button onClick={() => setError(null)} className="p-1 rounded-full text-red-400 hover:text-red-600 hover:bg-red-100 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                        {showWelcome ? 'Pick a Plan to Get Started' : 'Simple, Transparent Pricing'}
                    </h2>
                    <p className="mt-4 text-xl text-slate-600">
                        {showWelcome
                            ? 'Supercharge your legal practice with AI-powered tools.'
                            : "Choose the plan that fits your firm's size and needs."
                        }
                    </p>
                </div>

                <div className="mt-16 grid gap-8 lg:grid-cols-2 lg:max-w-4xl mx-auto">
                    {plans.map((plan) => (
                        <div key={plan.id} className={`relative bg-white rounded-2xl shadow-xl border-2 flex flex-col p-8 ${plan.recommended ? 'border-indigo-600' : 'border-transparent'}`}>
                            {plan.recommended && (
                                <div className="absolute top-0 right-1/2 transform translate-x-1/2 -translate-y-1/2">
                                    <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wide">
                                        {t('pricing.mostPopular')}
                                    </span>
                                </div>
                            )}
                            
                            <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                            <div className="mt-4 flex items-baseline text-slate-900">
                                <span className="text-5xl font-extrabold tracking-tight">₹{plan.price.toLocaleString()}</span>
                                <span className="ml-1 text-xl font-semibold text-slate-500">{t('pricing.perMonth')}</span>
                            </div>
                            
                            <ul className="mt-6 space-y-4 flex-1">
                                {plan.features.map((feature, index) => (
                                    <li key={index} className="flex">
                                        <CheckCircle className="flex-shrink-0 h-6 w-6 text-green-500" />
                                        <span className="ml-3 text-slate-500">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleSubscribe(plan)}
                                disabled={loading}
                                className={`mt-8 block w-full py-3 px-6 border border-transparent rounded-xl shadow text-center font-bold text-lg text-white transition-colors ${
                                    loading ? 'bg-slate-400 cursor-not-allowed' :
                                    plan.recommended ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800 hover:bg-slate-900'
                                }`}
                            >
                                {loading ? t('pricing.processing') : t('pricing.getStarted', { plan: plan.name })}
                            </button>
                        </div>
                    ))}
                </div>
                
                <div className="mt-12 text-center text-slate-500 text-sm">
                    <p>
                        {t('pricing.inviteeMessage')} <br/>
                        <a href="/portal" className="text-indigo-600 hover:underline">{t('pricing.freeAccess')}</a>
                    </p>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default Pricing;
