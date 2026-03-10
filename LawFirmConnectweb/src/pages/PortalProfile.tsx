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
const CreditCardIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
)
const LogoutIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
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
                    <div className="w-24 h-24 rounded-full text-white flex items-center justify-center text-3xl font-bold shadow-lg"
                         style={{ background: 'var(--gradient-accent)' }}>
                        {user.firstName ? user.firstName[0].toUpperCase() : ''}{user.lastName ? user.lastName[0].toUpperCase() : ''}
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{user.firstName} {user.lastName}</h1>
                        <p className="font-medium capitalize" style={{ color: 'var(--color-text-secondary)' }}>{user.role === 'ADMIN' ? 'Admin' : 'Attorney'}</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">

                    {/* Left Col: Navigation / Actions */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="card-surface overflow-hidden">
                            <div className="hidden lg:block p-4 font-bold" style={{ borderBottom: '1px solid var(--color-surface-border)', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>{t('profile.accountSettings')}</div>
                            <nav className="flex overflow-x-auto lg:flex-col p-2 space-x-1 lg:space-x-0 lg:space-y-1">
                                <Link to="info" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                                      style={isActive('info')
                                          ? { color: 'var(--color-accent)', backgroundColor: 'var(--color-accent-soft)' }
                                          : { color: 'var(--color-text-secondary)' }
                                      }>
                                    <UserIcon /> {t('profile.profileInfo')}
                                </Link>
                                <Link to="security" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                                      style={isActive('security')
                                          ? { color: 'var(--color-accent)', backgroundColor: 'var(--color-accent-soft)' }
                                          : { color: 'var(--color-text-secondary)' }
                                      }>
                                    <LockIcon /> {t('profile.security')}
                                </Link>
                                <Link to="notifications" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                                      style={isActive('notifications')
                                          ? { color: 'var(--color-accent)', backgroundColor: 'var(--color-accent-soft)' }
                                          : { color: 'var(--color-text-secondary)' }
                                      }>
                                    <BellIcon /> {t('profile.notifications')}
                                </Link>
                                <Link to="subscription" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                                      style={isActive('subscription')
                                          ? { color: 'var(--color-accent)', backgroundColor: 'var(--color-accent-soft)' }
                                          : { color: 'var(--color-text-secondary)' }
                                      }>
                                    <CreditCardIcon /> Subscription
                                </Link>
                                <button
                                    onClick={handleLogoutClick}
                                    className="flex lg:hidden items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                                    style={{ color: '#DC2626' }}
                                >
                                    <LogoutIcon /> {t('profile.signOut')}
                                </button>
                            </nav>
                        </div>

                        <button
                            onClick={handleLogoutClick}
                            className="hidden lg:flex w-full items-center justify-center gap-2 p-3 rounded-xl font-bold transition-colors shadow-sm border"
                            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#DC2626' }}
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
