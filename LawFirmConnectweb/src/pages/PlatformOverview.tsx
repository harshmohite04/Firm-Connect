import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

// SVG Icons
const BriefcaseIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
);

const ChatIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const SearchIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const DocumentIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const UploadIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const UsersIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const MessageIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const CalendarIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const GlobeIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const SparkleIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z" />
    </svg>
);

const PlatformOverview: React.FC = () => {
    const { t } = useTranslation();

    const features = [
        { icon: <BriefcaseIcon />, titleKey: 'caseManagement', descKey: 'caseManagementDesc' },
        { icon: <ChatIcon />, titleKey: 'ragChat', descKey: 'ragChatDesc' },
        { icon: <SearchIcon />, titleKey: 'investigation', descKey: 'investigationDesc' },
        { icon: <DocumentIcon />, titleKey: 'drafting', descKey: 'draftingDesc' },
        { icon: <UploadIcon />, titleKey: 'docManagement', descKey: 'docManagementDesc' },
        { icon: <UsersIcon />, titleKey: 'teamCollab', descKey: 'teamCollabDesc' },
        { icon: <MessageIcon />, titleKey: 'messaging', descKey: 'messagingDesc' },
        { icon: <CalendarIcon />, titleKey: 'calendar', descKey: 'calendarDesc' },
        { icon: <GlobeIcon />, titleKey: 'multilingual', descKey: 'multilingualDesc' },
    ];

    const pipelineSteps = [
        { step: 1, key: 'docAnalyst' },
        { step: 2, key: 'entityExtractor' },
        { step: 3, key: 'auditor' },
        { step: 4, key: 'primaryInvestigator' },
        { step: 5, key: 'crossExaminer' },
        { step: 6, key: 'evidenceValidator' },
        { step: 7, key: 'legalResearcher' },
        { step: 8, key: 'riskAssessor' },
        { step: 9, key: 'finalJudge' },
    ];

    const useCases = [
        'casePreparation',
        'caseInvestigation',
        'documentDrafting',
        'teamCoordination',
        'courtPreparation',
        'clientCommunication',
        'multilingualPractice',
    ];

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
                        <div className="badge-glow animate-pulse-glow">
                            <SparkleIcon />
                            <span>{t('platformOverview.badge') || 'PLATFORM'}</span>
                        </div>

                        {/* Headline */}
                        <div className="max-w-4xl mx-auto">
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                The Complete{' '}
                                <span className="text-gradient">Legal Intelligence</span>{' '}
                                Platform
                            </h1>

                            <p className="text-lg lg:text-xl mb-10 leading-relaxed max-w-2xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
                                {t('platformOverview.heroSubtitle')}
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-10 justify-center">
                                <Link to="/signin" className="btn-gradient text-center inline-flex items-center justify-center gap-2 text-base">
                                    {t('platformOverview.getStarted') || 'Get Started'}
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </Link>
                                <Link to="/contact" className="btn-ghost text-center inline-flex items-center justify-center gap-2 text-base">
                                    {t('platformOverview.contactSales') || 'Contact Sales'}
                                </Link>
                            </div>
                        </div>

                        {/* Dashboard Mockup */}
                        <div className="w-full max-w-5xl mx-auto animate-fade-in-up">
                            <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-surface-border)', boxShadow: 'var(--shadow-xl), var(--shadow-glow)' }}>
                                <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-surface-border)' }}>
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                    </div>
                                    <div className="flex-1 mx-4">
                                        <div className="h-7 rounded-lg px-3 flex items-center text-xs max-w-md mx-auto" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                                            app.lawfirmai.com/platform
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 sm:p-8" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                                    <div className="grid grid-cols-4 gap-4 mb-6">
                                        {['AI Agents', 'Languages', 'Templates', 'Uptime'].map((label, i) => (
                                            <div key={i} className="card-surface p-4 text-center">
                                                <div className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>{['9', '3', '5+', '99.9%'][i]}</div>
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
                                                        {['Active', 'Pending', 'Done'][i - 1]}
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

            {/* Who We Are - Stats Section */}
            <section className="section-alt py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
                                    {t('platformOverview.whoWeAreLabel') || 'WHO WE ARE'}
                                </span>
                                <h2 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight">
                                    {t('platformOverview.whoWeAreTitle') || 'Built for Modern Legal Professionals'}
                                </h2>
                            </div>
                            <p className="text-lg leading-relaxed font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                {t('platformOverview.whoWeAreDesc')}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { value: '9', labelKey: 'statAgents', label: 'AI Agents' },
                                { value: '3', labelKey: 'statLanguages', label: 'Languages' },
                                { value: '5+', labelKey: 'statTemplates', label: 'Templates' },
                                { value: '24/7', labelKey: 'statAvailability', label: 'Availability' },
                            ].map((stat, idx) => (
                                <div key={idx} className="card-surface p-8 group">
                                    <div className="text-4xl font-extrabold mb-2 tracking-tight group-hover:scale-110 transition-transform origin-left" style={{ color: 'var(--color-text-primary)' }}>
                                        {stat.value}
                                    </div>
                                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                                        {t(`platformOverview.${stat.labelKey}`) || stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Grid */}
            <section className="py-24" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 space-y-3">
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
                            {t('platformOverview.featuresLabel') || 'FEATURES'}
                        </span>
                        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                            {t('platformOverview.featuresTitle') || 'Everything You Need to Practice Smarter'}
                        </h2>
                        <p className="text-lg max-w-2xl mx-auto font-medium leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                            {t('platformOverview.featuresSubtitle')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, idx) => (
                            <div key={idx} className="card-surface p-8 flex flex-col items-center text-center group">
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                                     style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-bold mb-3 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                    {t(`platformOverview.features.${feature.titleKey}`)}
                                </h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                    {t(`platformOverview.features.${feature.descKey}`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* AI Investigation Pipeline */}
            <section className="section-alt py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 space-y-3">
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
                            {t('platformOverview.pipelineLabel') || 'INVESTIGATION ENGINE'}
                        </span>
                        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                            {t('platformOverview.pipelineTitle') || 'The 9-Agent Pipeline'}
                        </h2>
                        <p className="text-lg max-w-2xl mx-auto font-medium leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                            {t('platformOverview.pipelineSubtitle')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pipelineSteps.map((item) => (
                            <div key={item.step} className="card-surface p-6 flex items-center gap-4 group">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white transition-transform group-hover:scale-110"
                                     style={{ background: 'var(--gradient-accent)' }}>
                                    {item.step}
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
                                        {t(`platformOverview.pipeline.${item.key}.title`)}
                                    </h4>
                                    <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
                                        {t(`platformOverview.pipeline.${item.key}.desc`)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pipeline Output Banner */}
                    <div className="mt-12 rounded-2xl p-8 md:p-12 text-white relative overflow-hidden group"
                         style={{ background: 'var(--gradient-accent)' }}>
                        <div className="absolute top-0 left-0 w-full h-full bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="space-y-3">
                                <h4 className="text-2xl font-extrabold tracking-tight">{t('platformOverview.pipelineOutput') || 'Comprehensive Investigation Results'}</h4>
                                <p className="text-base font-medium text-white/70 max-w-2xl leading-relaxed">
                                    {t('platformOverview.pipelineOutputDesc')}
                                </p>
                            </div>
                            <button className="flex-shrink-0 px-8 py-4 bg-white rounded-xl text-sm font-bold uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all"
                                    style={{ color: 'var(--color-accent)' }}>
                                Explore Output
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Use Cases */}
            <section className="py-24" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 space-y-3">
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
                            {t('platformOverview.useCasesLabel') || 'USE CASES'}
                        </span>
                        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                            {t('platformOverview.useCasesTitle') || 'Applied Legal Intelligence'}
                        </h2>
                    </div>

                    <div className="max-w-4xl mx-auto space-y-4">
                        {useCases.map((uc, idx) => (
                            <div key={idx} className="card-surface p-6 flex flex-col md:flex-row md:items-center gap-6 group">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white transition-transform group-hover:scale-110"
                                     style={{ background: 'var(--gradient-accent)' }}>
                                    {idx + 1}
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                        {t(`platformOverview.useCases.${uc}.title`)}
                                    </h4>
                                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                        {t(`platformOverview.useCases.${uc}.desc`)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto rounded-2xl p-12 md:p-20 text-center text-white relative overflow-hidden"
                     style={{ background: 'var(--gradient-accent)', boxShadow: '0 25px 60px -12px rgba(79, 70, 229, 0.4)' }}>
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white opacity-5 rounded-full blur-[150px] translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-black opacity-10 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2"></div>

                    <div className="relative z-10 space-y-8">
                        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
                            {t('platformOverview.ctaTitle') || 'Ready to Transform Your Practice?'}
                        </h2>
                        <p className="max-w-2xl mx-auto text-lg font-medium text-white/70 leading-relaxed">
                            {t('platformOverview.ctaSubtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Link to="/signin" className="px-8 py-4 bg-white rounded-xl text-sm font-bold uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all"
                                  style={{ color: 'var(--color-accent)' }}>
                                {t('platformOverview.ctaGetStarted') || 'Get Started Free'}
                            </Link>
                            <Link to="/contact" className="px-8 py-4 bg-white/10 text-white rounded-xl text-sm font-bold uppercase tracking-wider border border-white/20 hover:bg-white/20 active:scale-95 transition-all">
                                {t('platformOverview.ctaContact') || 'Contact Us'}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default PlatformOverview;
