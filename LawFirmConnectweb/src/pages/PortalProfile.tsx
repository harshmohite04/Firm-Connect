import React, { useState, useEffect } from 'react';
import PortalLayout from '../components/PortalLayout';
import ConfirmationModal from '../components/ConfirmationModal';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Icons
const UserIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
)
const LockIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
)
const BellIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
)
const LogoutIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
)

const PortalProfile: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState<any>({
        firstName: '',
        lastName: '',
        role: ''
    });

    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmText: string;
        isDanger?: boolean;
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {},
        confirmText: "Confirm",
        isDanger: false
    });

    const closeConfirmation = () => setConfirmation(prev => ({ ...prev, isOpen: false }));

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleLogoutClick = () => {
        setConfirmation({
            isOpen: true,
            title: t('profile.signOutConfirmTitle'),
            message: t('profile.signOutConfirmMessage'),
            confirmText: t('profile.signOut'),
            onConfirm: confirmLogout,
            isDanger: false
        });
    };

    const confirmLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/signin');
        closeConfirmation();
    };

    const isActive = (path: string) => {
        return location.pathname.includes(path);
    }

    return (
        <PortalLayout>
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg ring-4 ring-blue-50">
                        {user.firstName ? user.firstName[0].toUpperCase() : ''}{user.lastName ? user.lastName[0].toUpperCase() : ''}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{user.firstName} {user.lastName}</h1>
                        <p className="text-slate-500 font-medium capitalize">{user.role === 'lawyer' ? t('profile.attorney') : user.role || t('profile.client')}</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    
                    {/* Left Col: Navigation / Actions */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700">{t('profile.accountSettings')}</div>
                            <nav className="flex flex-col p-2 space-y-1">
                                <Link to="info" className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive('info') ? 'text-blue-700 bg-blue-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                    <UserIcon /> {t('profile.profileInfo')}
                                </Link>
                                <Link to="security" className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive('security') ? 'text-blue-700 bg-blue-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                    <LockIcon /> {t('profile.security')}
                                </Link>
                                <Link to="notifications" className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive('notifications') ? 'text-blue-700 bg-blue-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                    <BellIcon /> {t('profile.notifications')}
                                </Link>
                            </nav>
                        </div>

                        <button
                            onClick={handleLogoutClick}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors shadow-sm"
                        >
                            <LogoutIcon /> {t('profile.signOut')}
                        </button>
                    </div>

                    {/* Right Col: Content Outlet */}
                    <div className="lg:col-span-2">
                        <Outlet />
                    </div>
                </div>
            </div>
            
            <ConfirmationModal
                isOpen={confirmation.isOpen}
                onClose={closeConfirmation}
                onConfirm={confirmation.onConfirm}
                title={confirmation.title}
                message={confirmation.message}
                confirmText={confirmation.confirmText}
                isDanger={confirmation.isDanger}
            />
        </PortalLayout>
    );
};

export default PortalProfile;
