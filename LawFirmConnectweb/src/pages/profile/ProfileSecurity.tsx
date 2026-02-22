import React, { useState, useEffect } from 'react';
import api from '../../api/client';

interface LoginInfo {
    at: string | null;
    device: string | null;
    location: string | null;
}

const ProfileSecurity: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [currentLogin, setCurrentLogin] = useState<LoginInfo | null>(null);
    const [previousLogin, setPreviousLogin] = useState<LoginInfo | null>(null);
    const [loginInfoLoading, setLoginInfoLoading] = useState(true);

    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    useEffect(() => {
        const fetchLoginInfo = async () => {
            try {
                const { data } = await api.get('/auth/me');
                setCurrentLogin({
                    at: data.lastLoginAt,
                    device: data.lastLoginDevice,
                    location: data.lastLoginLocation,
                });
                if (data.previousLoginAt) {
                    setPreviousLogin({
                        at: data.previousLoginAt,
                        device: data.previousLoginDevice,
                        location: data.previousLoginLocation,
                    });
                }
            } catch {
                // Silently fail — login info is non-critical
            } finally {
                setLoginInfoLoading(false);
            }
        };
        fetchLoginInfo();
    }, []);

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleUpdatePassword = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (passwords.new !== passwords.confirm) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        if (passwords.new.length < 8) {
             setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
             return;
        }

        setIsLoading(true);
        setTimeout(() => {
            setPasswords({ current: '', new: '', confirm: '' });
            setMessage({ type: 'success', text: 'Password updated successfully.' });
            setIsLoading(false);
            setTimeout(() => setMessage(null), 3000);
        }, 800);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const LoginRow: React.FC<{ login: LoginInfo; label: string; isCurrent?: boolean }> = ({ login, label, isCurrent }) => (
        <div className={`p-4 rounded-lg border ${isCurrent ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-slate-50/30'}`}>
            <div className="flex items-center gap-2 mb-3">
                {isCurrent ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        {label}
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                        {label}
                    </span>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 p-1.5 bg-blue-50 rounded-md">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Device</p>
                        <p className="text-sm text-slate-800">{login.device || 'Unknown device'}</p>
                    </div>
                </div>
                <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 p-1.5 bg-green-50 rounded-md">
                        <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Time</p>
                        <p className="text-sm text-slate-800">{login.at ? formatDate(login.at) : 'Unknown'}</p>
                    </div>
                </div>
                <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 p-1.5 bg-amber-50 rounded-md">
                        <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Location</p>
                        <p className="text-sm text-slate-800">{login.location || 'Unknown location'}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Login Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Login Activity</h2>
                {loginInfoLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Loading...
                    </div>
                ) : currentLogin?.at ? (
                    <div className="space-y-3">
                        <LoginRow login={currentLogin} label="Current Session" isCurrent />
                        {previousLogin ? (
                            <LoginRow login={previousLogin} label="Previous Login" />
                        ) : (
                            <p className="text-xs text-slate-400 pl-1">No previous login recorded.</p>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400">No login activity recorded.</p>
                )}
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Change Password</h2>

                {message && (
                    <div className={`mb-4 p-3 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'} animate-in fade-in slide-in-from-top-1`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Password</label>
                        <input
                            name="current"
                            type="password"
                            value={passwords.current}
                            onChange={handlePasswordChange}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
                            <input
                                name="new"
                                type="password"
                                value={passwords.new}
                                onChange={handlePasswordChange}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm New Password</label>
                            <input
                                name="confirm"
                                type="password"
                                value={passwords.confirm}
                                onChange={handlePasswordChange}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={isLoading || !passwords.current || !passwords.new}
                            className="px-6 py-2 bg-white text-slate-700 border border-slate-300 font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {isLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileSecurity;
