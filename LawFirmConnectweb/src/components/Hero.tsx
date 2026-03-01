import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../utils/analytics';

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" style={{ color: 'var(--color-accent)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const SparkleIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z" />
    </svg>
);

const Hero: React.FC = () => {
    const { t } = useTranslation();

    return (
        <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32" style={{ background: 'var(--gradient-hero-bg)' }}>
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, var(--color-accent-glow) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, var(--color-accent-glow) 0%, transparent 70%)' }} />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="flex flex-col gap-12 lg:gap-16 items-center text-center">
                    {/* Badge */}
                    <div className="badge-glow animate-pulse-glow">
                        <SparkleIcon />
                        <span>{t('hero.badge')}</span>
                    </div>

                    {/* Headline */}
                    <div className="max-w-4xl mx-auto -mt-6">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                            {t('hero.titleLine1')}{' '}
                            <span className="text-gradient">{t('hero.titleLine2')}</span>
                        </h1>

                        <p className="text-lg lg:text-xl mb-10 leading-relaxed max-w-2xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
                            {t('hero.subtitle')}
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-10 justify-center">
                            <Link
                                to="/pricing"
                                onClick={() => trackEvent({ category: 'Hero', action: 'Click', label: 'Start Free Trial' })}
                                className="btn-gradient text-center inline-flex items-center justify-center gap-2 text-base"
                            >
                                {t('hero.cta')}
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                            <Link
                                to="/platform"
                                onClick={() => trackEvent({ category: 'Hero', action: 'Click', label: 'See How It Works' })}
                                className="btn-ghost text-center inline-flex items-center justify-center gap-2 text-base"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {t('hero.learnMore')}
                            </Link>
                        </div>

                        {/* Trust Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-6 text-sm font-medium justify-center" style={{ color: 'var(--color-text-secondary)' }}>
                            <div className="flex items-center justify-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
                                    <CheckIcon />
                                </span>
                                {t('hero.freeConsultation')}
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
                                    <CheckIcon />
                                </span>
                                {t('hero.noWinNoFee')}
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
                                    <CheckIcon />
                                </span>
                                AI-Powered Research
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Mockup */}
                    <div className="w-full max-w-5xl mx-auto animate-fade-in-up">
                        <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-surface-border)', boxShadow: 'var(--shadow-xl), var(--shadow-glow)' }}>
                            {/* Browser Chrome */}
                            <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-surface-border)' }}>
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                </div>
                                <div className="flex-1 mx-4">
                                    <div className="h-7 rounded-lg px-3 flex items-center text-xs max-w-md mx-auto" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                                        app.lawfirmai.com/portal
                                    </div>
                                </div>
                            </div>
                            {/* Dashboard Content Preview */}
                            <div className="p-6 sm:p-8" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                                <div className="grid grid-cols-4 gap-4 mb-6">
                                    {['Active Cases', 'Pending', 'Messages', 'Hours'].map((label, i) => (
                                        <div key={i} className="card-surface p-4 text-center">
                                            <div className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>{[12, 5, 23, '148h'][i]}</div>
                                            <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{label}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2 card-surface p-4">
                                        <div className="h-3 w-24 rounded mb-3" style={{ backgroundColor: 'var(--color-accent-soft)' }}></div>
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
                                                <div className="h-2.5 rounded flex-1" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}></div>
                                                <div className="h-5 w-16 rounded-full text-[10px] flex items-center justify-center font-medium" style={{ backgroundColor: i === 1 ? 'var(--color-accent-soft)' : i === 2 ? 'rgba(245, 158, 11, 0.15)' : 'var(--color-bg-tertiary)', color: i === 1 ? 'var(--color-accent)' : i === 2 ? '#F59E0B' : 'var(--color-text-tertiary)' }}>
                                                    {['Active', 'Pending', 'Closed'][i - 1]}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="card-surface p-4">
                                        <div className="h-3 w-20 rounded mb-3" style={{ backgroundColor: 'var(--color-accent-soft)' }}></div>
                                        <div className="space-y-3">
                                            {[1, 2].map((i) => (
                                                <div key={i} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                                                    <div className="h-2 w-full rounded mb-1.5" style={{ backgroundColor: 'var(--color-surface-border)' }}></div>
                                                    <div className="h-2 w-2/3 rounded" style={{ backgroundColor: 'var(--color-surface-border)' }}></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
