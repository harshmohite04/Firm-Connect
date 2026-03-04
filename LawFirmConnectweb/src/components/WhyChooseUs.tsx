import React from 'react';
import { useTranslation } from 'react-i18next';

const GlobeIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CpuChipIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
);

const LockIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const WhyChooseUs: React.FC = () => {
    const { t } = useTranslation();

    const features = [
        { icon: <CpuChipIcon />, title: t('whyChooseUs.integrity'), desc: t('whyChooseUs.integrityDesc') },
        { icon: <LockIcon />, title: t('whyChooseUs.trackRecord'), desc: t('whyChooseUs.trackRecordDesc') },
        { icon: <ClockIcon />, title: t('whyChooseUs.clientCentric'), desc: t('whyChooseUs.clientCentricDesc') },
        { icon: <GlobeIcon />, title: t('whyChooseUs.multiLanguage'), desc: t('whyChooseUs.multiLanguageDesc') },
    ];

    return (
        <section className="py-20" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                    {/* Visual Side */}
                    <div className="relative order-2 lg:order-1">
                        <div className="relative rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--shadow-xl)' }}>
                            {/* Abstract gradient visual */}
                            <div className="h-[350px] sm:h-[450px] flex items-center justify-center relative" style={{ background: 'var(--gradient-cta)' }}>
                                {/* Decorative shapes */}
                                <div className="absolute inset-0">
                                    <div className="absolute top-10 left-10 w-32 h-32 rounded-full border-2 border-white/20 animate-float"></div>
                                    <div className="absolute bottom-20 right-16 w-24 h-24 rounded-full border-2 border-white/15" style={{ animationDelay: '2s', animation: 'float 8s ease-in-out infinite' }}></div>
                                    <div className="absolute top-1/2 left-1/3 w-16 h-16 rounded-xl border border-white/10" style={{ animationDelay: '4s', animation: 'float 10s ease-in-out infinite' }}></div>
                                </div>
                                {/* Shield icon */}
                                <div className="relative z-10 text-center">
                                    <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-white/15 backdrop-blur-xl flex items-center justify-center border border-white/20">
                                        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    <p className="text-white/80 text-lg font-semibold">Your Data is Secure</p>
                                    <p className="text-white/60 text-sm mt-1">Encrypted & Protected</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Side */}
                    <div className="order-1 lg:order-2">
                        <h2 className="text-3xl lg:text-4xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                            {t('whyChooseUs.title')}
                        </h2>
                        <p className="text-lg mb-10 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                            {t('whyChooseUs.subtitle')}
                        </p>

                        <div className="space-y-6">
                            {features.map((feature, i) => (
                                <div key={i} className="flex gap-4 p-4 rounded-xl transition-all duration-200 hover:scale-[1.01]" style={{ backgroundColor: 'transparent' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5" style={{ background: 'var(--gradient-accent)', color: 'white' }}>
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{feature.title}</h3>
                                        <p className="leading-relaxed text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                            {feature.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default WhyChooseUs;
