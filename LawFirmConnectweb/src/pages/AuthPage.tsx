import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import authService from '../services/authService';
import Logo from '../assets/logo.svg';

const EyeIcon = () => (
    <svg className="w-5 h-5 cursor-pointer transition-colors" style={{ color: 'var(--color-text-tertiary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const LockIcon = () => (
    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
);

const ShieldIcon = () => (
    <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

interface AuthPageProps {
    initialMode: 'signin' | 'signup';
}

const AuthPage: React.FC<AuthPageProps> = ({ initialMode }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from;
    const redirectPath = from?.pathname || '/portal';

    const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [signUpPassword, setSignUpPassword] = useState('');

    const toggleMode = () => {
        setError('');
        setShowPassword(false);
        setMode(mode === 'signin' ? 'signup' : 'signin');
    };

    const getPasswordErrors = (pwd: string): string[] => {
        const errors: string[] = [];
        if (pwd.length < 8) errors.push(t('signUp.pwdMinChars'));
        if (!/[A-Z]/.test(pwd)) errors.push(t('signUp.pwdUppercase'));
        if (!/[a-z]/.test(pwd)) errors.push(t('signUp.pwdLowercase'));
        if (!/[0-9]/.test(pwd)) errors.push(t('signUp.pwdNumber'));
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) errors.push(t('signUp.pwdSpecial'));
        return errors;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await authService.login(email, password);
            navigate(redirectPath, { replace: true });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const passwordErrors = getPasswordErrors(signUpPassword);
        if (passwordErrors.length > 0) {
            setError(`${t('signUp.pwdRequirements')} ${passwordErrors.join(', ')}`);
            return;
        }

        setIsLoading(true);
        try {
            await authService.register({ firstName, lastName, email, phone, password: signUpPassword });
            toast.success(t('signUp.successMessage'));
            setMode('signin');
        } catch (err: any) {
            setError(err.response?.data?.message || t('signUp.errorDefault'));
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass = "block w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2";
    const inputStyle = {
        backgroundColor: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-surface-border)',
        color: 'var(--color-text-primary)',
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 lg:p-14" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <div className="w-full max-w-6xl rounded-2xl overflow-hidden grid lg:grid-cols-2 min-h-[600px]" style={{ backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-xl)' }}>

                {/* Left Side: Form */}
                <div className="flex flex-col p-8 sm:p-12 lg:p-16 overflow-y-auto">
                    {/* Branding */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                            <div className="rounded-lg">
                                <img src={Logo} alt="" style={{ width: '5rem', height: '5rem' }} />
                            </div>
                            <span className="font-bold text-xl tracking-tight" style={{ color: 'var(--color-text-primary)' }}>LawFirmAI</span>
                        </div>
                    </div>

                    <div className="flex-grow flex flex-col justify-center w-full mx-auto">
                        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
                            {mode === 'signin' ? t('signIn.title') : t('signUp.title')}
                        </h1>
                        <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--color-text-secondary)' }}>
                            {mode === 'signin' ? t('signIn.subtitle') : t('signUp.subtitle')}
                        </p>

                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 text-red-500 text-sm rounded-xl border border-red-500/20">
                                {error}
                            </div>
                        )}

                        {mode === 'signin' ? (
                            <form className="space-y-5" onSubmit={handleLogin}>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="email" className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>{t('signIn.emailLabel')}</label>
                                        <input
                                            id="email" type="email" autoComplete="email" required
                                            value={email} onChange={(e) => setEmail(e.target.value)}
                                            className={inputClass} style={inputStyle}
                                            placeholder={t('signIn.emailPlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="password" className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>{t('signIn.passwordLabel')}</label>
                                        <div className="relative">
                                            <input
                                                id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required
                                                value={password} onChange={(e) => setPassword(e.target.value)}
                                                className={`${inputClass} pr-12`} style={inputStyle}
                                                placeholder={t('signIn.passwordPlaceholder')}
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                                                <EyeIcon />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <input id="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                                            className="h-4 w-4 rounded" style={{ accentColor: 'var(--color-accent)' }} />
                                        <label htmlFor="remember-me" className="ml-2 block text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                            {t('signIn.rememberDevice')}
                                        </label>
                                    </div>
                                    <div className="text-sm">
                                        <a href="#" className="font-semibold" style={{ color: 'var(--color-accent)' }}>
                                            {t('signIn.forgotPassword')}
                                        </a>
                                    </div>
                                </div>

                                <button type="submit" disabled={isLoading} className="btn-gradient w-full flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                                    {isLoading ? t('signIn.loggingIn') : (<><LockIcon /> {t('signIn.secureLogin')}</>)}
                                </button>

                                <div className="text-center mt-6">
                                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                        {t('signIn.firstTime')}{' '}
                                        <button type="button" onClick={toggleMode} className="font-bold" style={{ color: 'var(--color-accent)' }}>
                                            {t('signIn.activateAccount')}
                                        </button>
                                    </p>
                                </div>
                            </form>
                        ) : (
                            <form className="space-y-4" onSubmit={handleRegister}>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="firstName" className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>{t('signUp.firstName')}</label>
                                        <input id="firstName" type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                                            className={inputClass} style={inputStyle} placeholder={t('signUp.firstNamePlaceholder')} />
                                    </div>
                                    <div>
                                        <label htmlFor="lastName" className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>{t('signUp.lastName')}</label>
                                        <input id="lastName" type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                                            className={inputClass} style={inputStyle} placeholder={t('signUp.lastNamePlaceholder')} />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="signup-email" className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>{t('signUp.emailLabel')}</label>
                                    <input id="signup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                        className={inputClass} style={inputStyle} placeholder={t('signUp.emailPlaceholder')} />
                                </div>

                                <div>
                                    <label htmlFor="phone" className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>{t('signUp.phoneLabel')}</label>
                                    <input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                                        className={inputClass} style={inputStyle} placeholder={t('signUp.phonePlaceholder')} />
                                </div>

                                <div>
                                    <label htmlFor="signup-password" className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>{t('signUp.passwordLabel')}</label>
                                    <div className="relative">
                                        <input id="signup-password" type={showPassword ? "text" : "password"} required
                                            value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)}
                                            className={`${inputClass} pr-12`} style={inputStyle} placeholder={t('signUp.passwordPlaceholder')} />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                                            <EyeIcon />
                                        </div>
                                    </div>
                                    <p className="mt-1 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{t('signUp.passwordHint')}</p>
                                </div>

                                <button type="submit" disabled={isLoading} className="btn-gradient w-full flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                                    {isLoading ? t('signUp.processing') : (<><LockIcon /> {t('signUp.createAccount')}</>)}
                                </button>

                                <div className="text-center mt-6">
                                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                        {t('signUp.alreadyHaveAccount')}{' '}
                                        <button type="button" onClick={toggleMode} className="font-bold" style={{ color: 'var(--color-accent)' }}>
                                            {t('signUp.logIn')}
                                        </button>
                                    </p>
                                </div>
                            </form>
                        )}

                        <hr className="my-8" style={{ borderColor: 'var(--color-surface-border)' }} />

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 tracking-wider">
                                <ShieldIcon />
                                {mode === 'signin' ? t('signIn.sslSecure') : t('signUp.sslSecure')}
                            </div>
                            {mode === 'signin' && (
                                <p className="text-[10px] leading-normal" style={{ color: 'var(--color-text-tertiary)' }}>
                                    {t('signIn.sslDisclaimer')} <a href="#" className="underline">{t('signIn.termsOfService')}</a> {t('signIn.and')} <a href="#" className="underline">{t('signIn.privacyPolicy')}</a>.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Gradient Brand Panel */}
                <div className="hidden lg:relative lg:flex lg:flex-col lg:justify-end overflow-hidden" style={{ background: 'var(--gradient-cta)' }}>
                    {/* Decorative shapes */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-20 right-16 w-40 h-40 rounded-full border-2 border-white/10 animate-float"></div>
                        <div className="absolute bottom-32 left-12 w-28 h-28 rounded-full border border-white/15" style={{ animation: 'float 10s ease-in-out infinite' }}></div>
                        <div className="absolute top-1/3 left-1/3 w-20 h-20 rounded-xl border border-white/10" style={{ animation: 'float 8s ease-in-out infinite 2s' }}></div>
                        <div className="absolute top-10 left-20 w-3 h-3 rounded-full bg-white/20"></div>
                        <div className="absolute bottom-20 right-20 w-2 h-2 rounded-full bg-white/25"></div>
                    </div>

                    {/* Content */}
                    <div className="relative h-full flex flex-col justify-between p-16">
                        {/* Top: feature badges */}
                        <div className="space-y-3 mt-8">
                            {[
                                { icon: '⚡', text: 'AI-Powered Case Intelligence' },
                                { icon: '🔒', text: 'Bank-Grade Security (256-bit SSL)' },
                                { icon: '📊', text: 'Real-time Analytics Dashboard' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 w-fit">
                                    <span className="text-lg">{item.icon}</span>
                                    <span className="text-white/90 text-sm font-medium">{item.text}</span>
                                </div>
                            ))}
                        </div>

                        {/* Bottom: quote */}
                        <div className="mt-auto">
                            {mode === 'signin' && (
                                <span className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-white/70 mb-4 backdrop-blur-sm">
                                    {t('signIn.portalVersion')}
                                </span>
                            )}
                            <h2 className="text-2xl font-bold text-white leading-tight mb-4 tracking-tight">
                                {mode === 'signin' ? t('signIn.rightQuote') : t('signUp.rightQuote')}
                            </h2>
                            <div className="w-12 h-1 rounded-full mb-6" style={{ background: 'var(--gradient-accent)' }}></div>
                            {mode === 'signin' && (
                                <div>
                                    <p className="text-white font-semibold">{t('signIn.expertSupport')}</p>
                                    <p className="text-white/60 text-sm">{t('signIn.expertSupportDesc')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AuthPage;
