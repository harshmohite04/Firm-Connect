import React from 'react';
import { useTranslation } from 'react-i18next';

// Icons
const GlobeIcon = () => (
    <svg className="w-8 h-8" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
)

const CpuChipIcon = () => (
    <svg className="w-8 h-8" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
)

const HeartIcon = () => (
    <svg className="w-8 h-8" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
)



const AboutUs: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen relative overflow-hidden" 
             style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
            
            {/* Hero Section - Cinematic Storytelling */}
            <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full blur-[150px] opacity-20" style={{ backgroundColor: 'var(--color-accent)' }}></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-10" style={{ backgroundColor: 'var(--color-accent)' }}></div>
                </div>
                
                <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 text-center space-y-8">
                    <div className="inline-flex items-center gap-3 rounded-full px-6 py-2 backdrop-blur-xl border shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700" 
                         style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: 'var(--color-text-primary)' }}>
                            {t('aboutUs.heroTitle').split(' ')[0]}
                        </span>
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tighter animate-in fade-in slide-in-from-bottom-10 duration-1000">
                        {t('aboutUs.heroTitle')}
                    </h1>
                    <p className="max-w-3xl mx-auto text-lg md:text-2xl font-medium opacity-60 leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
                        {t('aboutUs.heroSubtitle')}
                    </p>
                </div>
            </section>

            {/* Mission Section - Elegant Spacing */}
            <section className="py-32" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div className="max-w-7xl mx-auto px-6 lg:px-12">
                    <div className="grid lg:grid-cols-2 gap-24 items-start mb-24">
                        <div className="space-y-6">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: 'var(--color-accent)' }}>
                                {t('aboutUs.missionLabel')}
                            </span>
                            <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tighter">
                                {t('aboutUs.missionTitle')}
                            </h2>
                        </div>
                        <div className="lg:pt-14">
                            <p className="text-2xl opacity-60 leading-relaxed font-medium">
                                {t('aboutUs.missionDesc')}
                            </p>
                        </div>
                    </div>
 
                    {/* Values Cards - Premium Glassmorphism */}
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { titleKey: 'integrity', icon: <GlobeIcon />, descKey: 'integrityDesc' },
                            { titleKey: 'excellence', icon: <CpuChipIcon />, descKey: 'excellenceDesc' },
                            { titleKey: 'clientCentric', icon: <HeartIcon />, descKey: 'clientCentricDesc' },
                        ].map((value, idx) => (
                            <div key={idx} className="group p-12 rounded-[3.5rem] transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-2xl border flex flex-col items-center text-center"
                                 style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                                <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-10 shadow-2xl transition-transform group-hover:scale-110 group-hover:rotate-6" 
                                     style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                                    {value.icon}
                                </div>
                                <h3 className="text-2xl font-black mb-6 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t(`aboutUs.${value.titleKey}`)}</h3>
                                <p className="text-sm font-medium opacity-50 leading-relaxed">
                                    {t(`aboutUs.${value.descKey}`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Banner - Impactful Highlight */}
            <section className="py-24 relative overflow-hidden text-white" 
                     style={{ background: 'var(--gradient-accent)' }}>
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white opacity-5 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2"></div>
                
                <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center md:divide-x md:divide-white/20">
                        {[
                            { value: '9', key: 'yearsExperience' },
                            { value: '3', key: 'recovered' },
                            { value: '5+', key: 'casesWon' },
                            { value: '24/7', key: 'expertAttorneys' },
                        ].map((stat, i) => (
                            <div key={i} className="space-y-2 px-8">
                                <div className="text-6xl md:text-8xl font-black tracking-tighter transition-transform hover:scale-110 duration-500">{stat.value}</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">{t(`aboutUs.${stat.key}`)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* History Section - Sophisticated Timeline */}
            <section className="py-32" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                <div className="max-w-7xl mx-auto px-6 lg:px-12">
                    <div className="grid lg:grid-cols-2 gap-24 items-center">
                        <div className="space-y-16">
                            <h2 className="text-4xl md:text-6xl font-black tracking-tighter" style={{ color: 'var(--color-text-primary)' }}>{t('aboutUs.historyTitle')}</h2>
                            
                            <div className="space-y-12 relative">
                                <div className="absolute left-[24px] top-6 bottom-6 w-0.5 opacity-20" style={{ backgroundColor: 'var(--color-accent)' }}></div>
                                
                                {[
                                    { year: '2024', title: 'year1998Title', desc: 'year1998Desc' },
                                    { year: '2025', title: 'year2010Title', desc: 'year2010Desc' },
                                    { year: '2026', title: 'year2023Title', desc: 'year2023Desc' },
                                ].map((step, i) => (
                                    <div key={i} className="group relative flex gap-10 items-start">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center z-10 shadow-2xl transition-all group-hover:scale-110 group-hover:rotate-6"
                                             style={{ background: 'var(--gradient-accent)' }}>
                                            <div className="w-2 h-2 rounded-full bg-white"></div>
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{step.year}</span>
                                            <h3 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t(`aboutUs.${step.title}`)}</h3>
                                            <p className="text-sm font-medium opacity-50 leading-relaxed max-w-md">
                                                {t(`aboutUs.${step.desc}`)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
 
                        <div className="relative group">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-[80px] rounded-full opacity-0 group-hover:opacity-40 transition-opacity"></div>
                            <div className="rounded-[4rem] overflow-hidden shadow-2xl relative z-10 transition-transform duration-700 hover:scale-[1.02]">
                                <img
                                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070"
                                    alt="Technology workspace"
                                    className="w-full h-[600px] object-cover scale-110 group-hover:scale-100 transition-transform duration-1000"
                                />
                                <div className="absolute inset-0 bg-indigo-900/40 mix-blend-overlay"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Team Section - Profile Cards */}
            <section className="py-32" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
                    <div className="mb-24 space-y-4">
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter" style={{ color: 'var(--color-text-primary)' }}>{t('aboutUs.foundersTitle')}</h2>
                        <p className="max-w-2xl mx-auto text-xl font-medium opacity-60 leading-relaxed">
                            {t('aboutUs.foundersSubtitle')}
                        </p>
                    </div>
 
                    <div className="max-w-lg mx-auto">
                        {[
                            { name: t('aboutUs.founderName'), role: t('aboutUs.founderRole'), img: '/assets/harsh mohite img.png' },
                        ].map((member, idx) => (
                            <div key={idx} className="group rounded-[3.5rem] overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-2xl border" 
                                 style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                                <div className="h-[450px] overflow-hidden relative">
                                    <img src={member.img} alt={member.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" />
                                    <div className="absolute inset-0 bg-indigo-900/20 group-hover:bg-transparent transition-colors"></div>
                                </div>
                                <div className="p-12 space-y-6 text-left">
                                    <div className="space-y-1">
                                        <h3 className="text-3xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{member.name}</h3>
                                        <div className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: 'var(--color-accent)' }}>{member.role}</div>
                                    </div>
                                    <p className="text-sm font-medium opacity-50 leading-relaxed">
                                        {t('aboutUs.founderBio')}
                                    </p>
                                    <a href="#" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors hover:gap-4" 
                                       style={{ color: 'var(--color-accent)' }}>
                                        {t('aboutUs.viewProfile')} <span className="text-xl">→</span>
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Bottom CTA - Impactful Finish */}
            <section className="py-32 px-6">
                <div className="max-w-5xl mx-auto rounded-[4rem] p-16 md:p-32 text-center relative overflow-hidden shadow-[0_50px_100px_-30px_rgba(79,70,229,0.3)] group"
                     style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)' }}>
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500 opacity-5 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
                    
                    <div className="relative z-10 space-y-12">
                        <div className="space-y-4">
                            <h2 className="text-4xl md:text-7xl font-black tracking-tighter" style={{ color: 'var(--color-text-primary)' }}>{t('aboutUs.ctaTitle')}</h2>
                            <p className="max-w-2xl mx-auto text-xl font-medium opacity-60 leading-relaxed">
                                {t('aboutUs.ctaSubtitle')}
                            </p>
                        </div>
 
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
                            {[
                                { key: 'topRated', label: t('aboutUs.topRated') },
                                { key: 'noWinNoFee', label: t('aboutUs.noWinNoFee') },
                            ].map((item) => (
                                <div key={item.key} className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-primary)' }}>
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: 'var(--gradient-accent)' }}>✓</div>
                                    {item.label}
                                </div>
                            ))}
                        </div>
 
                        <button className="px-12 py-6 rounded-[2.5rem] text-xs font-black uppercase tracking-widest text-white shadow-2xl hover:scale-110 active:scale-95 transition-all"
                                style={{ background: 'var(--gradient-accent)' }}>
                            {t('aboutUs.scheduleConsultation')}
                        </button>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default AboutUs;
