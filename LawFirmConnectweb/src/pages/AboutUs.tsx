import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

// Icons
const GlobeIcon = () => (
    <svg className="w-6 h-6" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CpuChipIcon = () => (
    <svg className="w-6 h-6" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
);

const HeartIcon = () => (
    <svg className="w-6 h-6" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
);

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

const AboutUs: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen relative overflow-hidden"
             style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>

            {/* Hero Section */}
            <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32 overflow-hidden" style={{ background: 'var(--gradient-hero-bg)' }}>
                {/* Decorative orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, var(--color-accent-glow) 0%, transparent 70%)' }} />
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, var(--color-accent-glow) 0%, transparent 70%)' }} />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="flex flex-col gap-8 items-center text-center">
                        {/* Badge */}
                        <div className="badge-glow">
                            <SparkleIcon />
                            <span>{t('aboutUs.heroTitle').split(' ')[0] || 'OUR STORY'}</span>
                        </div>

                        {/* Headline */}
                        <div className="max-w-4xl mx-auto">
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                {t('aboutUs.heroTitle').replace(/Technology|Innovation/gi, '').trim()}{' '}
                                <span className="text-gradient">{t('aboutUs.heroTitle').match(/Technology|Innovation/gi)?.[0] || 'Technology'}</span>
                            </h1>

                            <p className="text-lg lg:text-xl mb-10 leading-relaxed max-w-2xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
                                {t('aboutUs.heroSubtitle')}
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-10 justify-center">
                                <Link to="/pricing" className="btn-gradient text-center inline-flex items-center justify-center gap-2 text-base">
                                    {t('aboutUs.scheduleConsultation') || 'Get Started'}
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </Link>
                                <Link to="/platform" className="btn-ghost text-center inline-flex items-center justify-center gap-2 text-base">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {t('aboutUs.viewProfile') || 'Watch Demo'}
                                </Link>
                            </div>

                            {/* Trust Badges */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-6 text-sm font-medium justify-center" style={{ color: 'var(--color-text-secondary)' }}>
                                {[
                                    t('aboutUs.topRated') || 'Top Rated Platform',
                                    t('aboutUs.noWinNoFee') || 'No Win No Fee',
                                    'AI-Powered Research',
                                ].map((badge, i) => (
                                    <div key={i} className="flex items-center justify-center gap-2">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
                                            <CheckIcon />
                                        </span>
                                        {badge}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Banner */}
            <section className="py-16 relative overflow-hidden text-white" style={{ background: 'var(--gradient-accent)' }}>
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white opacity-5 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:divide-x md:divide-white/20">
                        {[
                            { value: '9', key: 'yearsExperience' },
                            { value: '3 Cr+', key: 'recovered' },
                            { value: '5+', key: 'casesWon' },
                            { value: '24/7', key: 'expertAttorneys' },
                        ].map((stat, i) => (
                            <div key={i} className="space-y-2 px-4">
                                <div className="text-4xl md:text-5xl font-extrabold tracking-tight">{stat.value}</div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-white/70">{t(`aboutUs.${stat.key}`)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mission & Values Section */}
            <section className="section-alt py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 space-y-3">
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
                            {t('aboutUs.missionLabel') || 'OUR VALUES'}
                        </span>
                        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                            {t('aboutUs.missionTitle') || 'Built on Foundation of Trust'}
                        </h2>
                        <p className="text-lg max-w-2xl mx-auto font-medium leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                            {t('aboutUs.missionDesc')}
                        </p>
                    </div>

                    {/* Values Cards */}
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { titleKey: 'integrity', icon: <GlobeIcon />, descKey: 'integrityDesc' },
                            { titleKey: 'excellence', icon: <CpuChipIcon />, descKey: 'excellenceDesc' },
                            { titleKey: 'clientCentric', icon: <HeartIcon />, descKey: 'clientCentricDesc' },
                        ].map((value, idx) => (
                            <div key={idx} className="card-surface p-8 flex flex-col items-center text-center">
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
                                    {value.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                    {t(`aboutUs.${value.titleKey}`)}
                                </h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                    {t(`aboutUs.${value.descKey}`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* History Timeline Section */}
            <section className="py-24" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Image */}
                        <div className="relative group order-2 lg:order-1">
                            <div className="rounded-2xl overflow-hidden relative" style={{ border: '1px solid var(--color-surface-border)', boxShadow: 'var(--shadow-xl)' }}>
                                <img
                                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070"
                                    alt="Technology workspace"
                                    className="w-full h-[400px] lg:h-[500px] object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="space-y-10 order-1 lg:order-2">
                            <div className="space-y-3">
                                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
                                    {t('aboutUs.historyTitle') ? 'OUR JOURNEY' : 'OUR JOURNEY'}
                                </span>
                                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                    {t('aboutUs.historyTitle') || 'Our Evolution'}
                                </h2>
                            </div>

                            <div className="space-y-8 relative">
                                <div className="absolute left-[19px] top-8 bottom-8 w-0.5" style={{ backgroundColor: 'var(--color-surface-border)' }}></div>

                                {[
                                    { year: '2024', title: 'year1998Title', desc: 'year1998Desc', label: 'The Genesis' },
                                    { year: '2025', title: 'year2010Title', desc: 'year2010Desc', label: 'Global Expansion' },
                                    { year: '2026', title: 'year2023Title', desc: 'year2023Desc', label: 'Autonomous Advocacy' },
                                ].map((step, i) => (
                                    <div key={i} className="group relative flex gap-6 items-start">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center z-10 text-white text-sm font-bold"
                                             style={{ background: 'var(--gradient-accent)' }}>
                                            {i + 1}
                                        </div>
                                        <div className="space-y-1 pt-1">
                                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}>{step.year}</span>
                                            <h3 className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                                {t(`aboutUs.${step.title}`) || step.label}
                                            </h3>
                                            <p className="text-sm leading-relaxed max-w-md" style={{ color: 'var(--color-text-secondary)' }}>
                                                {t(`aboutUs.${step.desc}`)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Founder Section */}
            <section className="section-alt py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="mb-16 space-y-3">
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
                            LEADERSHIP
                        </span>
                        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                            {t('aboutUs.foundersTitle') || 'Led by Visionaries'}
                        </h2>
                        <p className="max-w-2xl mx-auto text-lg font-medium leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                            {t('aboutUs.foundersSubtitle')}
                        </p>
                    </div>

                    <div className="max-w-lg mx-auto">
                        <div className="card-surface overflow-hidden">
                            <div className="h-[350px] overflow-hidden relative">
                                <img
                                    src="/assets/harsh mohite img.png"
                                    alt={t('aboutUs.founderName')}
                                    className="w-full h-full object-cover grayscale hover:grayscale-0 hover:scale-105 transition-all duration-700"
                                />
                            </div>
                            <div className="p-8 space-y-4 text-left">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                        {t('aboutUs.founderName')}
                                    </h3>
                                    <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}>
                                        {t('aboutUs.founderRole')}
                                    </div>
                                </div>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                    {t('aboutUs.founderBio')}
                                </p>
                                <div className="flex gap-3 pt-2">
                                    <a href="#" className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                                    </a>
                                    <a href="#" className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bottom CTA Section */}
            <section className="py-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto rounded-2xl p-12 md:p-20 text-center relative overflow-hidden"
                     style={{ backgroundColor: 'var(--color-accent-soft)', border: '1px solid var(--color-surface-border)' }}>
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2 opacity-20" style={{ backgroundColor: 'var(--color-accent)' }}></div>

                    <div className="relative z-10 space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                {t('aboutUs.ctaTitle') || 'Ready to Transform Your Legal Practice?'}
                            </h2>
                            <p className="max-w-2xl mx-auto text-lg font-medium leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                {t('aboutUs.ctaSubtitle')}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            {[
                                { key: 'topRated', label: t('aboutUs.topRated') || 'Top Rated' },
                                { key: 'noWinNoFee', label: t('aboutUs.noWinNoFee') || 'No Win No Fee' },
                            ].map((item) => (
                                <div key={item.key} className="flex items-center gap-3 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs" style={{ background: 'var(--gradient-accent)' }}>✓</span>
                                    {item.label}
                                </div>
                            ))}
                        </div>

                        <Link to="/pricing" className="btn-gradient inline-flex items-center justify-center gap-2 text-base">
                            {t('aboutUs.scheduleConsultation') || 'Schedule Consultation'}
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default AboutUs;
