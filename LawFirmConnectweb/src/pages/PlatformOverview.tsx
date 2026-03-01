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
        { icon: <CreditCardIcon />, titleKey: 'billing', descKey: 'billingDesc' },
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

            {/* Hero Section - High End Gradient & Typography */}
            <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: 'var(--color-accent)' }}></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-10" style={{ backgroundColor: 'var(--color-accent)' }}></div>
                </div>
                
                <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 text-center">
                    <div className="inline-flex items-center gap-3 rounded-full px-6 py-2 mb-8 backdrop-blur-xl border shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700" 
                         style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-accent)' }}></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: 'var(--color-text-primary)' }}>{t('platformOverview.badge')}</span>
                    </div>
                    
                    <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[0.95] tracking-tighter animate-in fade-in slide-in-from-bottom-10 duration-1000">
                        {t('platformOverview.heroTitle').split(' ').map((word, i) => (
                            <span key={i} className="inline-block mr-4 last:mr-0">
                                {i % 2 === 1 ? <span style={{ color: 'var(--color-accent)' }}>{word}</span> : word}
                            </span>
                        ))}
                    </h1>
                    
                    <p className="max-w-3xl mx-auto text-lg md:text-2xl font-medium opacity-60 leading-relaxed mb-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
                        {t('platformOverview.heroSubtitle')}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
                        <Link to="/signin" className="px-10 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/20"
                              style={{ background: 'var(--gradient-accent)' }}>
                            {t('platformOverview.getStarted')}
                        </Link>
                        <Link to="/contact" className="px-10 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 border-2 hover:bg-slate-500/5"
                              style={{ borderColor: 'var(--color-surface-border)', color: 'var(--color-text-primary)' }}>
                            {t('platformOverview.contactSales')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Who We Are - Stats Grid */}
            <section className="py-32 relative overflow-hidden" 
                     style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div className="max-w-7xl mx-auto px-6 lg:px-12">
                    <div className="grid lg:grid-cols-2 gap-24 items-center">
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: 'var(--color-accent)' }}>
                                    {t('platformOverview.whoWeAreLabel')}
                                </span>
                                <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tighter">
                                    {t('platformOverview.whoWeAreTitle')}
                                </h2>
                            </div>
                            <p className="text-xl opacity-60 leading-relaxed font-medium">
                                {t('platformOverview.whoWeAreDesc')}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            {[
                                { value: '9', labelKey: 'statAgents', gradient: 'from-blue-500 to-indigo-600' },
                                { value: '3', labelKey: 'statLanguages', gradient: 'from-purple-500 to-rose-500' },
                                { value: '5+', labelKey: 'statTemplates', gradient: 'from-emerald-400 to-cyan-500' },
                                { value: '24/7', labelKey: 'statAvailability', gradient: 'from-amber-400 to-orange-500' },
                            ].map((stat, idx) => (
                                <div key={idx} className="group p-10 rounded-[2.5rem] transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-2xl relative overflow-hidden" 
                                     style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)' }}>
                                    <div className="relative z-10">
                                        <div className="text-5xl font-black mb-2 tracking-tighter group-hover:scale-110 transition-transform origin-left" 
                                             style={{ color: 'var(--color-text-primary)' }}>{stat.value}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity" 
                                             style={{ color: 'var(--color-text-secondary)' }}>{t(`platformOverview.${stat.labelKey}`)}</div>
                                    </div>
                                    <div className={`absolute bottom-0 right-0 w-32 h-32 blur-[60px] opacity-10 bg-gradient-to-br ${stat.gradient}`}></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Grid - Premium Cards */}
            <section className="py-32" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                <div className="max-w-7xl mx-auto px-6 lg:px-12">
                    <div className="text-center mb-24 space-y-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: 'var(--color-accent)' }}>
                            {t('platformOverview.featuresLabel')}
                        </span>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter" style={{ color: 'var(--color-text-primary)' }}>
                            {t('platformOverview.featuresTitle')}
                        </h2>
                        <p className="text-xl max-w-2xl mx-auto opacity-60 font-medium leading-relaxed">
                            {t('platformOverview.featuresSubtitle')}
                        </p>
                    </div>
 
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, idx) => (
                            <div key={idx} className="group p-10 rounded-[3rem] transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-xl hover:shadow-2xl border flex flex-col items-center text-center"
                                 style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                                <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-2xl transition-transform group-hover:scale-110 group-hover:rotate-3" 
                                     style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-accent)' }}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-2xl font-black mb-4 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                    {t(`platformOverview.features.${feature.titleKey}`)}
                                </h3>
                                <p className="text-sm font-medium opacity-50 leading-relaxed">
                                    {t(`platformOverview.features.${feature.descKey}`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* AI Investigation Pipeline - Flow Redesign */}
            <section className="py-32" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div className="max-w-7xl mx-auto px-6 lg:px-12">
                    <div className="text-center mb-24 space-y-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: 'var(--color-accent)' }}>
                            {t('platformOverview.pipelineLabel')}
                        </span>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter" style={{ color: 'var(--color-text-primary)' }}>
                            {t('platformOverview.pipelineTitle')}
                        </h2>
                        <p className="text-xl max-w-2xl mx-auto opacity-60 font-medium leading-relaxed">
                            {t('platformOverview.pipelineSubtitle')}
                        </p>
                    </div>
 
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                        {pipelineSteps.map((item) => (
                            <div key={item.step} className="group p-8 rounded-[2.5rem] transition-all duration-500 hover:scale-[1.05] shadow-xl border flex items-center gap-6"
                                 style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                                <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all" 
                                     style={{ background: 'var(--gradient-accent)' }}>
                                    {item.step}
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--color-text-primary)' }}>
                                        {t(`platformOverview.pipeline.${item.key}.title`)}
                                    </h4>
                                    <p className="text-xs font-bold opacity-40 leading-relaxed">
                                        {t(`platformOverview.pipeline.${item.key}.desc`)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
 
                    <div className="mt-20 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group"
                         style={{ background: 'var(--gradient-accent)' }}>
                        <div className="absolute top-0 left-0 w-full h-full bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                            <div className="space-y-4">
                                <h4 className="text-3xl font-black tracking-tighter">{t('platformOverview.pipelineOutput')}</h4>
                                <p className="text-lg font-medium text-white/70 max-w-2xl leading-relaxed">
                                    {t('platformOverview.pipelineOutputDesc')}
                                </p>
                            </div>
                            <button className="px-10 py-5 bg-white text-indigo-600 rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all">
                                Explore Output
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* How Lawyers Leverage - premium list */}
            <section className="py-32" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                <div className="max-w-7xl mx-auto px-6 lg:px-12">
                    <div className="text-center mb-24 space-y-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: 'var(--color-accent)' }}>
                            {t('platformOverview.useCasesLabel')}
                        </span>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter" style={{ color: 'var(--color-text-primary)' }}>
                            {t('platformOverview.useCasesTitle')}
                        </h2>
                    </div>
 
                    <div className="max-w-5xl mx-auto space-y-6">
                        {useCases.map((uc, idx) => (
                            <div key={idx} className="group rounded-[2.5rem] p-10 transition-all duration-500 hover:scale-[1.02] shadow-xl border flex flex-col md:flex-row md:items-center gap-10"
                                 style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                                <div className="flex-shrink-0 w-16 h-16 rounded-[1.25rem] flex items-center justify-center font-black text-2xl text-white shadow-2xl transition-all group-hover:scale-110" 
                                     style={{ background: 'var(--gradient-accent)' }}>
                                    {idx + 1}
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                        {t(`platformOverview.useCases.${uc}.title`)}
                                    </h4>
                                    <p className="text-lg font-medium opacity-50 leading-relaxed">
                                        {t(`platformOverview.useCases.${uc}.desc`)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* Summary / CTA - High Conversion Design */}
            <section className="py-32 px-6">
                <div className="max-w-7xl mx-auto rounded-[4rem] p-16 md:p-32 text-center text-white relative overflow-hidden shadow-[0_50px_100px_-30px_rgba(79,70,229,0.5)] group"
                     style={{ background: 'var(--gradient-accent)' }}>
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white opacity-5 rounded-full blur-[150px] translate-x-1/2 -translate-y-1/2 group-hover:opacity-10 transition-opacity"></div>
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-black opacity-10 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2 group-hover:opacity-20 transition-opacity"></div>
                    
                    <div className="relative z-10 space-y-10">
                        <h2 className="text-5xl md:text-8xl font-black tracking-tighter leading-none">{t('platformOverview.ctaTitle')}</h2>
                        <p className="max-w-3xl mx-auto text-xl md:text-2xl font-medium text-white/70 leading-relaxed">
                            {t('platformOverview.ctaSubtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-6">
                            <Link to="/signin" className="px-12 py-6 bg-white text-indigo-600 rounded-[2.5rem] text-xs font-black uppercase tracking-widest shadow-2xl hover:scale-110 active:scale-95 transition-all">
                                {t('platformOverview.ctaGetStarted')}
                            </Link>
                            <Link to="/contact" className="px-12 py-6 bg-white/10 text-white rounded-[2.5rem] text-xs font-black uppercase tracking-widest border border-white/20 hover:bg-white/20 active:scale-95 transition-all">
                                {t('platformOverview.ctaContact')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default PlatformOverview;
