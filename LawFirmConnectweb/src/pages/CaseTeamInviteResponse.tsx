import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle, XCircle, Briefcase, Loader, UserPlus } from 'lucide-react';

const CaseTeamInviteResponse: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'pending' | 'success' | 'error' | 'login_required'>('loading');
    const [message, setMessage] = useState('');
    const [caseInfo, setCaseInfo] = useState<{ id: string; title: string } | null>(null);
    const [isReject, setIsReject] = useState(false);
    const [inviterName, setInviterName] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid invitation link');
            return;
        }

        // Check if user is logged in
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            setStatus('login_required');
            setMessage('Please log in to respond to this invitation');
            return;
        }

        const path = window.location.pathname;
        if (path.endsWith('/accept')) {
            // Direct accept link (from email)
            executeAction('accept');
        } else if (path.endsWith('/reject')) {
            // Direct reject link (from email)
            executeAction('reject');
        } else {
            // Neutral link (from notification) — show Accept/Reject buttons
            loadInvitationDetails();
        }
    }, [token]);

    const loadInvitationDetails = async () => {
        try {
            // Fetch invitation details to show context
            const res = await api.get('/team/my-case-invitations');
            const invitations = res.data.invitations || [];
            const match = invitations.find((inv: any) => inv.token === token);
            if (match) {
                setCaseInfo(match.case ? { id: match.case.id, title: match.case.title } : null);
                if (match.invitedBy) {
                    setInviterName(`${match.invitedBy.firstName} ${match.invitedBy.lastName || ''}`.trim());
                }
            }
            setStatus('pending');
        } catch {
            // Even if fetch fails, still show buttons
            setStatus('pending');
        }
    };

    const executeAction = async (action: 'accept' | 'reject') => {
        setProcessing(true);
        const reject = action === 'reject';
        setIsReject(reject);

        try {
            if (reject) {
                await api.post(`/team/case-invitations/${token}/reject`);
                setStatus('success');
                setMessage('Invitation Declined');
            } else {
                const res = await api.post(`/team/case-invitations/${token}/accept`);
                setStatus('success');
                setMessage(res.data.message || 'You have successfully joined the team');
                if (res.data.case) {
                    setCaseInfo({ id: res.data.case.id, title: res.data.case.title });
                }
            }
        } catch (error: any) {
            setStatus('error');
            setMessage(error?.response?.data?.message || 'Something went wrong');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 max-w-md w-full p-8 text-center">
                {status === 'loading' && (
                    <>
                        <Loader className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-spin" />
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Loading Invitation...</h2>
                        <p className="text-slate-500">Please wait</p>
                    </>
                )}

                {status === 'pending' && (
                    <>
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UserPlus className="h-8 w-8 text-indigo-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Case Team Invitation</h2>
                        {inviterName && (
                            <p className="text-slate-600 mb-1">
                                <strong>{inviterName}</strong> invited you to join the team
                            </p>
                        )}
                        {caseInfo && (
                            <p className="text-slate-500 mb-6">
                                for case <strong>"{caseInfo.title}"</strong>
                            </p>
                        )}
                        {!caseInfo && !inviterName && (
                            <p className="text-slate-500 mb-6">
                                You've been invited to join a case team.
                            </p>
                        )}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => executeAction('reject')}
                                disabled={processing}
                                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                            >
                                {processing && isReject ? 'Declining...' : 'Decline'}
                            </button>
                            <button
                                onClick={() => executeAction('accept')}
                                disabled={processing}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {processing && !isReject ? 'Accepting...' : 'Accept'}
                            </button>
                        </div>
                    </>
                )}

                {status === 'success' && !isReject && (
                    <>
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">{message}</h2>
                        {caseInfo && (
                            <p className="text-slate-500 mb-6">
                                You are now a team member on <strong>{caseInfo.title}</strong>
                            </p>
                        )}
                        <button
                            onClick={() => navigate(caseInfo ? `/portal/cases/${caseInfo.id}` : '/portal/cases')}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            Go to Case
                        </button>
                    </>
                )}

                {status === 'success' && isReject && (
                    <>
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Briefcase className="h-8 w-8 text-slate-500" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">{message}</h2>
                        <p className="text-slate-500 mb-6">The case creator has been notified.</p>
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
                            to="/portal"
                            className="inline-block px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                        >
                            Go to Portal
                        </Link>
                    </>
                )}

                {status === 'login_required' && (
                    <>
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Briefcase className="h-8 w-8 text-amber-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Login Required</h2>
                        <p className="text-slate-500 mb-6">{message}</p>
                        <Link
                            to={`/signin?redirect=${encodeURIComponent(window.location.pathname)}`}
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

export default CaseTeamInviteResponse;
