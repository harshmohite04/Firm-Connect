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
    const [activeFeature, setActiveFeature] = React.useState(0);

    const features = [
        {
            id: 0,
            title: t('hero.features.caseManagement', 'Case Management'), // Fallback if translation missing
            description: t('hero.features.caseManagementDesc', 'Organize every detail.'),
            video: '/assets/hero-video.mp4' 
        },
        {
            id: 1,
            title: t('hero.features.aiDrafting', 'AI Drafting'),
            description: t('hero.features.aiDraftingDesc', 'Draft documents in seconds.'),
            video: '/assets/hero-video.mp4' // Placeholder: User needs to add different videos
        },
        {
            id: 2,
            title: t('hero.features.clientPortal', 'Client Portal'),
            description: t('hero.features.clientPortalDesc', 'Secure client communication.'),
            video: '/assets/hero-video.mp4' // Placeholder
        }
    ];

    React.useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        // Reset video when feature changes
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
    }, [activeFeature]); // Re-run when feature changes

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
                                to="/contact" 
                                onClick={() => trackEvent({ category: 'Hero', action: 'Click', label: 'Get Legal Help' })}
                                className="px-7 py-3.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-center inline-block"
                            >
                                {t('hero.cta')}
                            </Link>
                            <Link 
                                to="/practice-areas" 
                                onClick={() => trackEvent({ category: 'Hero', action: 'Click', label: 'Learn More' })}
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
                    <div className="relative w-full mx-auto mt-12 lg:mt-16">
                        {/* Browser Window Frame - Light Theme */}
                        <div className="rounded-xl overflow-hidden shadow-2xl shadow-slate-200/50 bg-white border border-slate-200 flex flex-col ring-1 ring-slate-900/5">
                            {/* Browser Toolbar */}
                            <div className="bg-slate-50 px-4 py-3 flex items-center gap-2 border-b border-slate-200 shrink-0">
                                <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500/10"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500/10"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500/10"></div>
                                {/* Address Bar Simulation */}
                                <div className="ml-4 flex-1 bg-white border border-slate-200 rounded-md h-7 w-full max-w-sm mx-auto hidden sm:block flex items-center px-3 text-xs text-slate-500 font-mono shadow-sm">
                                    <span className="text-slate-300 mr-2">🔒</span>
                                    lawfirmconnect.com/features/{features[activeFeature].title.toLowerCase().replace(' ', '-')}
                                </div>
                            </div>
                            
                            {/* Browser Body (Sidebar + Content) */}
                            <div className="flex flex-col md:flex-row h-[600px] md:h-[750px]">
                                {/* Sidebar */}
                                <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
                                    <div className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Features</div>
                                    <div className="flex-1 overflow-y-auto">
                                        {features.map((feature, index) => (
                                            <button
                                                key={feature.id}
                                                onClick={() => setActiveFeature(index)}
                                                className={`w-full text-left px-4 py-3 border-l-2 transition-all duration-200 ${
                                                    activeFeature === index 
                                                    ? 'bg-white border-blue-600 text-slate-900 shadow-sm' 
                                                    : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                                }`}
                                            >
                                                <div className="font-bold text-sm">{feature.title}</div>
                                                <div className={`text-xs mt-0.5 truncate ${activeFeature === index ? 'text-slate-600' : 'text-slate-400'}`}>
                                                    {feature.description}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    {/* Sidebar Footer */}
                                    <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-xs text-white font-bold shadow-sm shadow-blue-600/20">LC</div>
                                            <div className="text-xs text-slate-500">
                                                <div className="text-slate-900 font-bold">Law Connect</div>
                                                <div>Enterprise Ready</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Video Area */}
                                <div className="flex-1 bg-slate-100 relative flex flex-col">
                                    <div className="relative flex-1 bg-slate-900 overflow-hidden">
                                        <video 
                                            key={activeFeature} // Force re-render on change
                                            ref={videoRef}
                                            loop 
                                            muted 
                                            playsInline
                                            poster="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&q=80&w=1974"
                                            className="object-cover w-full h-full"
                                        >
                                            <source src={features[activeFeature].video} type="video/mp4" />
                                            {/* Fallback */}
                                            <img 
                                                src="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&q=80&w=1974" 
                                                alt="Legal Team Meeting" 
                                                className="object-cover w-full h-full"
                                            />
                                        </video>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Decor elements */}
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-100 rounded-full blur-3xl -z-10 mix-blend-multiply opacity-50"></div>
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-100 rounded-full blur-3xl -z-10 mix-blend-multiply opacity-50"></div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
