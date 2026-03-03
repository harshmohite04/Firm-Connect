import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { InvitationInfo } from '../services/organizationService';
import organizationService from '../services/organizationService';
import { Building2, Loader, XCircle, Eye, EyeOff, UserPlus } from 'lucide-react';

const InviteSetup: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        fetchInvitationInfo();
    }, [token]);

    const fetchInvitationInfo = async () => {
        if (!token) {
            setError('Invalid invitation link');
            setLoading(false);
            return;
        }

        try {
            const info = await organizationService.getInvitationInfo(token);
            setInvitationInfo(info);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Invitation not found or has expired');
        } finally {
            setLoading(false);
        }
    };

    const getPasswordErrors = (pwd: string): string[] => {
        const errors: string[] = [];
        if (pwd.length < 8) errors.push('at least 8 characters');
        if (!/[A-Z]/.test(pwd)) errors.push('an uppercase letter');
        if (!/[a-z]/.test(pwd)) errors.push('a lowercase letter');
        if (!/[0-9]/.test(pwd)) errors.push('a number');
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) errors.push('a special character');
        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        const pwdErrors = getPasswordErrors(password);
        if (pwdErrors.length > 0) {
            setFormError(`Password must contain: ${pwdErrors.join(', ')}`);
            return;
        }

        if (!token) return;

        setSubmitting(true);
        try {
            const data = await organizationService.completeInviteSetup(token, {
                firstName,
                lastName,
                phone,
                password,
            });

            // Store user data in localStorage (same as authService.login)
            localStorage.setItem('user', JSON.stringify(data));

            // Redirect to FirmConnect where they'll see the pending invitation
            navigate('/portal/firm-connect');
        } catch (err: any) {
            setFormError(err?.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-3xl shadow-lg border border-slate-200 max-w-md w-full p-8 text-center">
                    <Loader className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-spin" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Loading Invitation...</h2>
                    <p className="text-slate-500">Please wait</p>
                </div>
            </div>
        );
    }

    // Error state (expired/not found)
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-3xl shadow-lg border border-slate-200 max-w-md w-full p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Invitation Error</h2>
                    <p className="text-slate-500 mb-6">{error}</p>
                    <Link
                        to="/"
                        className="inline-block px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                    >
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    // User already exists — redirect to login
    if (invitationInfo?.userExists) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-3xl shadow-lg border border-slate-200 max-w-md w-full p-8 text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Building2 className="h-8 w-8 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Account Already Exists</h2>
                    <p className="text-slate-500 mb-2">
                        An account already exists for <strong>{invitationInfo.invitedEmail}</strong>.
                    </p>
                    <p className="text-slate-500 mb-6">
                        Please log in to accept the invitation from <strong>{invitationInfo.organizationName}</strong>.
                    </p>
                    <Link
                        to="/signin"
                        className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                    >
                        Log In
                    </Link>
                </div>
            </div>
        );
    }

    // Setup form
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center px-4 py-12">
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 max-w-md w-full p-8">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserPlus className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Set Up Your Account</h2>
                    <p className="text-slate-500">
                        You've been invited to join{' '}
                        <strong className="text-slate-700">{invitationInfo?.organizationName}</strong>
                    </p>
                </div>

                {/* Email (read-only) */}
                <div className="mb-4 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                    <p className="text-xs text-slate-400 mb-0.5">Email</p>
                    <p className="text-sm font-medium text-slate-700">{invitationInfo?.invitedEmail}</p>
                </div>

                {formError && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                        {formError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                placeholder="John"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Last Name
                            </label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                placeholder="Doe"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="+91 98765 43210"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all pr-10"
                                placeholder="Create a strong password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">
                            Min 8 chars, uppercase, lowercase, number, and special character
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Creating Account...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <p className="text-xs text-center text-slate-400 mt-4">
                    Already have an account?{' '}
                    <Link to="/signin" className="text-indigo-600 hover:text-indigo-700 font-medium">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default InviteSetup;
