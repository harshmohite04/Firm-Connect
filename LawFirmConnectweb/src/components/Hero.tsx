import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../utils/analytics';

const CheckIcon = () => (
    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);



const Hero: React.FC = () => {
    const { t } = useTranslation();
    const videoRef = React.useRef<HTMLVideoElement>(null);
    React.useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        videoElement.load();

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        videoElement.play().catch((error) => {
                            console.log("Autoplay prevented:", error);
                        });
                    } else {
                        videoElement.pause();
                    }
                });
            },
            {
                threshold: 0.7,
            }
        );

        observer.observe(videoElement);

        return () => {
             if (videoElement) {
                observer.unobserve(videoElement);
            }
        };
    }, []);

    return (
        <section className="relative bg-white pt-10 pb-20 lg:pt-16 lg:pb-28 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                
                <div className="flex flex-col gap-12 lg:gap-16 items-center text-center">
                    {/* Top Content */}
                    <div className="max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-6 mx-auto">
                             <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
                             <span className="text-xs font-semibold text-blue-700 tracking-wide uppercase">{t('hero.badge')}</span>
                        </div>
                        
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.15] mb-6 tracking-tight">
                            {t('hero.titleLine1')} <br className="hidden sm:block" />
                            {t('hero.titleLine2')}
                        </h1>
                        
                        <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
                            {t('hero.subtitle')}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 mb-10 justify-center">
                            <Link
                                to="/pricing"
                                onClick={() => trackEvent({ category: 'Hero', action: 'Click', label: 'Start Free Trial' })}
                                className="px-7 py-3.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-center inline-block"
                            >
                                {t('hero.cta')}
                            </Link>
                            <Link
                                to="/platform"
                                onClick={() => trackEvent({ category: 'Hero', action: 'Click', label: 'See How It Works' })}
                                className="px-7 py-3.5 bg-white text-slate-700 border border-slate-200 font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-center inline-block"
                            >
                                {t('hero.learnMore')}
                            </Link>
                        </div>

                         <div className="flex flex-col sm:flex-row sm:items-center gap-6 text-sm font-medium text-slate-600 justify-center">
                            <div className="flex items-center justify-center">
                                <span className="bg-blue-100 rounded-full p-0.5 mr-2"><CheckIcon /></span>
                                {t('hero.freeConsultation')}
                            </div>
                            <div className="flex items-center justify-center">
                                <span className="bg-blue-100 rounded-full p-0.5 mr-2"><CheckIcon /></span>
                                {t('hero.noWinNoFee')}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Video with Browser Frame & Sidebar */}
                    
                    
                </div>
            </div>
        </section>
    );
};

export default Hero;
