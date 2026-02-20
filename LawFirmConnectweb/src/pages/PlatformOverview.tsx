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

const CreditCardIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
);

const GlobeIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ShieldIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const PlatformOverview: React.FC = () => {
    const { t } = useTranslation();

    const features = [
        { icon: <BriefcaseIcon />, titleKey: 'caseManagement', descKey: 'caseManagementDesc', color: 'blue' },
        { icon: <ChatIcon />, titleKey: 'ragChat', descKey: 'ragChatDesc', color: 'purple' },
        { icon: <SearchIcon />, titleKey: 'investigation', descKey: 'investigationDesc', color: 'orange' },
        { icon: <DocumentIcon />, titleKey: 'drafting', descKey: 'draftingDesc', color: 'emerald' },
        { icon: <UploadIcon />, titleKey: 'docManagement', descKey: 'docManagementDesc', color: 'sky' },
        { icon: <UsersIcon />, titleKey: 'teamCollab', descKey: 'teamCollabDesc', color: 'indigo' },
        { icon: <MessageIcon />, titleKey: 'messaging', descKey: 'messagingDesc', color: 'pink' },
        { icon: <CalendarIcon />, titleKey: 'calendar', descKey: 'calendarDesc', color: 'amber' },
        { icon: <CreditCardIcon />, titleKey: 'billing', descKey: 'billingDesc', color: 'teal' },
        { icon: <GlobeIcon />, titleKey: 'multilingual', descKey: 'multilingualDesc', color: 'rose' },
    ];

    const colorMap: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        sky: 'bg-sky-50 text-sky-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        pink: 'bg-pink-50 text-pink-600',
        amber: 'bg-amber-50 text-amber-600',
        teal: 'bg-teal-50 text-teal-600',
        rose: 'bg-rose-50 text-rose-600',
    };

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

    const securityFeatures = [
        'jwt',
        'rateLimiting',
        'inputSanitization',
        'docOwnership',
        'caseIsolation',
        'passwordSecurity',
        'fileValidation',
        'encryption',
    ];

    return (
        <div className="bg-white min-h-screen">

            {/* Hero Section */}
            <section className="relative h-[400px] md:h-[500px]">
                <div className="absolute inset-0">
                    <img
                        src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=2340"
                        alt="Legal Technology"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-900/80 mix-blend-multiply"></div>
                </div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center text-center items-center">
                    <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-400/30 rounded-full px-4 py-1.5 mb-6">
                        <span className="text-blue-300 text-sm font-medium">{t('platformOverview.badge')}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6">
                        {t('platformOverview.heroTitle')}
                    </h1>
                    <p className="text-slate-300 text-lg md:text-xl max-w-3xl font-light">
                        {t('platformOverview.heroSubtitle')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 mt-8">
                        <Link to="/signup" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg">
                            {t('platformOverview.getStarted')}
                        </Link>
                        <Link to="/contact" className="bg-white/10 backdrop-blur-sm text-white px-8 py-3 rounded-lg font-bold hover:bg-white/20 transition-colors border border-white/20">
                            {t('platformOverview.contactSales')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Who We Are */}
            <section className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="text-blue-600 font-bold uppercase tracking-widest text-sm mb-2">{t('platformOverview.whoWeAreLabel')}</div>
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
                                {t('platformOverview.whoWeAreTitle')}
                            </h2>
                            <p className="text-slate-600 text-lg leading-relaxed">
                                {t('platformOverview.whoWeAreDesc')}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { value: '25+', labelKey: 'statYears' },
                                { value: '2,000+', labelKey: 'statCases' },
                                { value: '15', labelKey: 'statAttorneys' },
                                { value: '9', labelKey: 'statAgents' },
                            ].map((stat, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center">
                                    <div className="text-3xl font-extrabold text-blue-600 mb-1">{stat.value}</div>
                                    <div className="text-slate-500 text-sm">{t(`platformOverview.${stat.labelKey}`)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* What We Provide - Feature Grid */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <div className="text-blue-600 font-bold uppercase tracking-widest text-sm mb-2">{t('platformOverview.featuresLabel')}</div>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            {t('platformOverview.featuresTitle')}
                        </h2>
                        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                            {t('platformOverview.featuresSubtitle')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all group">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${colorMap[feature.color]}`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                                    {t(`platformOverview.features.${feature.titleKey}`)}
                                </h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    {t(`platformOverview.features.${feature.descKey}`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* AI Investigation Pipeline */}
            <section className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <div className="text-blue-600 font-bold uppercase tracking-widest text-sm mb-2">{t('platformOverview.pipelineLabel')}</div>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            {t('platformOverview.pipelineTitle')}
                        </h2>
                        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                            {t('platformOverview.pipelineSubtitle')}
                        </p>
                    </div>

                    <div className="relative">
                        {/* Pipeline Steps */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pipelineSteps.map((item) => (
                                <div key={item.step} className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md transition-all flex items-start gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                        {item.step}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">
                                            {t(`platformOverview.pipeline.${item.key}.title`)}
                                        </h4>
                                        <p className="text-slate-500 text-xs mt-1">
                                            {t(`platformOverview.pipeline.${item.key}.desc`)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Output Summary */}
                        <div className="mt-8 bg-blue-600 text-white rounded-xl p-6">
                            <h4 className="font-bold text-lg mb-3">{t('platformOverview.pipelineOutput')}</h4>
                            <p className="text-blue-100 text-sm leading-relaxed">
                                {t('platformOverview.pipelineOutputDesc')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How Lawyers Leverage */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <div className="text-blue-600 font-bold uppercase tracking-widest text-sm mb-2">{t('platformOverview.useCasesLabel')}</div>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            {t('platformOverview.useCasesTitle')}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {useCases.map((uc, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-xl p-6 border border-slate-100 hover:border-blue-200 transition-all">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="flex-shrink-0">
                                        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold text-sm">
                                            {idx + 1}
                                        </span>
                                    </div>
                                    <div className="flex-grow">
                                        <h4 className="font-bold text-slate-900 mb-1">
                                            {t(`platformOverview.useCases.${uc}.title`)}
                                        </h4>
                                        <p className="text-slate-500 text-sm">
                                            {t(`platformOverview.useCases.${uc}.desc`)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Subscription Plans */}
            <section className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <div className="text-blue-600 font-bold uppercase tracking-widest text-sm mb-2">{t('platformOverview.plansLabel')}</div>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            {t('platformOverview.plansTitle')}
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Starter Plan */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-lg transition-all">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{t('platformOverview.plans.starter.name')}</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-extrabold text-slate-900">{t('platformOverview.plans.starter.price')}</span>
                                <span className="text-slate-500 text-sm">{t('platformOverview.plans.perMonth')}</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                {['feature1', 'feature2', 'feature3', 'feature4'].map((f) => (
                                    <li key={f} className="flex items-center gap-3 text-sm text-slate-600">
                                        <CheckIcon />
                                        {t(`platformOverview.plans.starter.${f}`)}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/pricing" className="block text-center bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-200 transition-colors">
                                {t('platformOverview.plans.selectPlan')}
                            </Link>
                        </div>

                        {/* Professional Plan */}
                        <div className="bg-white rounded-2xl border-2 border-blue-600 p-8 hover:shadow-lg transition-all relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                {t('platformOverview.plans.popular')}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{t('platformOverview.plans.professional.name')}</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-extrabold text-slate-900">{t('platformOverview.plans.professional.price')}</span>
                                <span className="text-slate-500 text-sm">{t('platformOverview.plans.perMonth')}</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                {['feature1', 'feature2', 'feature3', 'feature4'].map((f) => (
                                    <li key={f} className="flex items-center gap-3 text-sm text-slate-600">
                                        <CheckIcon />
                                        {t(`platformOverview.plans.professional.${f}`)}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/pricing" className="block text-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg">
                                {t('platformOverview.plans.selectPlan')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Technology & Security */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16">
                        {/* Tech Stack */}
                        <div>
                            <div className="text-blue-600 font-bold uppercase tracking-widest text-sm mb-2">{t('platformOverview.techLabel')}</div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-8">{t('platformOverview.techTitle')}</h2>
                            <div className="space-y-4">
                                {[
                                    { key: 'frontend', value: 'React 19 + TypeScript + Vite + Tailwind CSS' },
                                    { key: 'backend', value: 'Node.js/Express + Python/FastAPI' },
                                    { key: 'databases', value: 'MongoDB + Qdrant + Neo4j' },
                                    { key: 'ai', value: 'DeepSeek LLM + BAAI/bge-m3 + Sarvam OCR' },
                                    { key: 'realtime', value: 'Socket.io' },
                                    { key: 'payments', value: 'Razorpay' },
                                ].map((item) => (
                                    <div key={item.key} className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                                        <div>
                                            <span className="font-semibold text-slate-900">{t(`platformOverview.tech.${item.key}`)}: </span>
                                            <span className="text-slate-500 text-sm">{item.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Security */}
                        <div>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                                    <ShieldIcon />
                                </div>
                                <div>
                                    <div className="text-emerald-600 font-bold uppercase tracking-widest text-sm">{t('platformOverview.securityLabel')}</div>
                                    <h2 className="text-3xl font-bold text-slate-900">{t('platformOverview.securityTitle')}</h2>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {securityFeatures.map((sf) => (
                                    <div key={sf} className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg">
                                        <CheckIcon />
                                        <span className="text-slate-600 text-sm">{t(`platformOverview.security.${sf}`)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Summary / CTA */}
            <section className="py-16 mx-4">
                <div className="max-w-7xl mx-auto bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 md:p-12 text-center shadow-xl">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{t('platformOverview.ctaTitle')}</h2>
                    <p className="text-blue-100 mb-8 max-w-3xl mx-auto text-lg">
                        {t('platformOverview.ctaSubtitle')}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/signup" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-lg">
                            {t('platformOverview.ctaGetStarted')}
                        </Link>
                        <Link to="/contact" className="bg-blue-500/30 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-500/50 transition-colors border border-white/20">
                            {t('platformOverview.ctaContact')}
                        </Link>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default PlatformOverview;
