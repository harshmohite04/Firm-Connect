import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import organizationService from '../services/organizationService';
import { CheckCircle, XCircle, Building2, Loader } from 'lucide-react';

const InviteAccept: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'login_required'>('loading');
    const [message, setMessage] = useState('');
    const [orgName, setOrgName] = useState('');

    useEffect(() => {
        handleAction();
    }, [token]);

    const handleAction = async () => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid invitation link');
            return;
        }

        // Check if user is logged in
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            setStatus('login_required');
            setMessage('Please log in to accept this invitation');
            return;
        }

        try {
            // Determine if accept or reject from the URL path
            const isReject = window.location.pathname.includes('/reject');

            if (isReject) {
                await organizationService.rejectInvitation(token);
                setStatus('success');
                setMessage('Invitation declined');
            } else {
                const result = await organizationService.acceptInvitation(token);
                setStatus('success');
                setMessage(result.message);
                setOrgName(result.organization.name);

                // Update local storage with new org info
                const user = JSON.parse(userStr);
                user.organizationId = result.organization.id;
                user.role = 'ATTORNEY';
                localStorage.setItem('user', JSON.stringify(user));
            }
        } catch (error: any) {
            setStatus('error');
            setMessage(error?.response?.data?.message || 'Something went wrong');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 max-w-md w-full p-8 text-center">
                {status === 'loading' && (
                    <>
                        <Loader className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-spin" />
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Processing Invitation...</h2>
                        <p className="text-slate-500">Please wait</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">{message}</h2>
                        {orgName && (
                            <p className="text-slate-500 mb-6">
                                You are now a member of <strong>{orgName}</strong>
                            </p>
                        )}
                        <button
                            onClick={() => navigate('/portal')}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            Go to Portal
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Invitation Error</h2>
                        <p className="text-slate-500 mb-6">{message}</p>
                        <Link
                            to="/"
                            className="inline-block px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                        >
                            Go Home
                        </Link>
                    </>
                )}

                {status === 'login_required' && (
                    <>
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 className="h-8 w-8 text-amber-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Login Required</h2>
                        <p className="text-slate-500 mb-6">{message}</p>
                        <Link
                            to={`/login?redirect=/invite/${token}/accept`}
                            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            Log In
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default InviteAccept;
