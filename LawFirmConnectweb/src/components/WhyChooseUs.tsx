import React from 'react';
import { useTranslation } from 'react-i18next';

// Icons
const GlobeIcon = () => (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
)

const CpuChipIcon = () => (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
)

const LockIcon = () => (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
)


const WhyChooseUs: React.FC = () => {
    const { t } = useTranslation();

    return (
        <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                    {/* Image Side */}
                    <div className="relative order-2 lg:order-1">
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl h-[300px] sm:h-[400px] lg:h-[500px]">
                            <img
                                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1974"
                                alt="Analytics dashboard on laptop"
                                className="object-cover w-full h-full"
                            />

                            {/* Quote Overlay */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-8 pt-24 text-white">
                                <blockquote className="font-serif text-xl sm:text-2xl italic leading-relaxed mb-4">
                                    {t('whyChooseUs.quote')}
                                </blockquote>
                                <cite className="text-sm font-semibold tracking-wider uppercase not-italic text-slate-300">
                                    {t('whyChooseUs.quoteAuthor')}
                                </cite>
                            </div>
                        </div>
                    </div>

                    {/* Content Side */}
                    <div className="order-1 lg:order-2">
                        <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
                            {t('whyChooseUs.title')}
                        </h2>
                        <p className="text-lg text-slate-600 mb-10 leading-relaxed">
                            {t('whyChooseUs.subtitle')}
                        </p>

                        <div className="space-y-8">

                            {/* Feature 1 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mt-1">
                                    <GlobeIcon />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">{t('whyChooseUs.integrity')}</h3>
                                    <p className="text-slate-600 leading-relaxed">
                                        {t('whyChooseUs.integrityDesc')}
                                    </p>
                                </div>
                            </div>

                            {/* Feature 2 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mt-1">
                                    <CpuChipIcon />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">{t('whyChooseUs.trackRecord')}</h3>
                                    <p className="text-slate-600 leading-relaxed">
                                        {t('whyChooseUs.trackRecordDesc')}
                                    </p>
                                </div>
                            </div>

                             {/* Feature 3 */}
                             <div className="flex gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mt-1">
                                    <LockIcon />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">{t('whyChooseUs.clientCentric')}</h3>
                                    <p className="text-slate-600 leading-relaxed">
                                        {t('whyChooseUs.clientCentricDesc')}
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default WhyChooseUs;
