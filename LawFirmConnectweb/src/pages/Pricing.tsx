import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

declare global {
    interface Window {
        Razorpay: any;
    }
}

const Pricing: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (location.state?.error) {
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
                // Redirect to login with return path
                navigate('/signin', { state: { from: { pathname: '/pricing' } } });
                return;
            }

            // 1. Create Order
            const { data: orderData } = await axios.post(
                `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/payments/create-order`,
                { planId: plan.id, amount: plan.price },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!orderData.success) {
                setError('Failed to initiate payment');
                setLoading(false);
                return;
            }

            // 2. Open Razorpay Modal
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
                amount: orderData.order.amount,
                currency: "INR",
                name: "LawfirmAI",
                description: `Subscription for ${plan.name} Plan`,
                order_id: orderData.order.id,
                handler: async function (response: any) {
                    try {
                        // 3. Verify Payment
                        const verifyRes = await axios.post(
                            `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/payments/verify`,
                            {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                planId: plan.id
                            },
                            { headers: { Authorization: `Bearer ${token}` } }
                        );

                        if (verifyRes.data.success) {
                            // Payment Successful
                            navigate('/portal');
                        } else {
                            setError('Payment Verification Failed');
                        }
                    } catch (error) {
                        console.error(error);
                        setError('Payment Verification Error');
                    }
                },
                prefill: {
                    name: "User Name", // Should fetch from user profile
                    email: "user@example.com",
                    contact: "9999999999"
                },
                theme: {
                    color: "#4F46E5"
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.open();

        } catch (error) {
            console.error('Payment Error:', error);
            setError('Something went wrong during payment initialization');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            
            <div className="flex-grow pt-24 pb-12 px-4 sm:px-6 lg:px-8">
                {error && (
                     <div className="max-w-7xl mx-auto mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-red-800">
                                    Access Denied
                                </p>
                                <p className="mt-1 text-sm text-red-700">
                                    {error}
                                </p>
                            </div>
                            <div className="ml-auto pl-3">
                                <div className="-mx-1.5 -my-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setError(null)}
                                        className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                                    >
                                        <span className="sr-only">Dismiss</span>
                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                        Simple, Transparent Pricing
                    </h2>
                    <p className="mt-4 text-xl text-slate-600">
                        Choose the plan that fits your firm's size and needs.
                    </p>
                </div>

                <div className="mt-16 grid gap-8 lg:grid-cols-2 lg:max-w-4xl mx-auto">
                    {plans.map((plan) => (
                        <div key={plan.id} className={`relative bg-white rounded-2xl shadow-xl border-2 flex flex-col p-8 ${plan.recommended ? 'border-indigo-600' : 'border-transparent'}`}>
                            {plan.recommended && (
                                <div className="absolute top-0 right-1/2 transform translate-x-1/2 -translate-y-1/2">
                                    <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wide">
                                        Most Popular
                                    </span>
                                </div>
                            )}
                            
                            <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                            <div className="mt-4 flex items-baseline text-slate-900">
                                <span className="text-5xl font-extrabold tracking-tight">₹{plan.price.toLocaleString()}</span>
                                <span className="ml-1 text-xl font-semibold text-slate-500">/month</span>
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
                                {loading ? 'Processing...' : `Get Started with ${plan.name}`}
                            </button>
                        </div>
                    ))}
                </div>
                
                <div className="mt-12 text-center text-slate-500 text-sm">
                    <p>
                        Are you an invitee with an <strong>@harsh.com</strong> email? <br/>
                        <a href="/portal" className="text-indigo-600 hover:underline">Access is free for you.</a>
                    </p>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default Pricing;
