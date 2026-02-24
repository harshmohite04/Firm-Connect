import React from 'react';
import { useTranslation } from 'react-i18next';

// Icons
const GlobeIcon = () => (
    <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
)

const CpuChipIcon = () => (
    <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
)

const HeartIcon = () => (
    <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
)




const AboutUs: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="bg-white min-h-screen">
            
            {/* Hero Section */}
            <section className="relative h-[400px] md:h-[500px]">
                <div className="absolute inset-0">
                    <img 
                        src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2301" 
                        alt="Law Firm Office" 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-blue-900/80 mix-blend-multiply"></div>
                </div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center text-center items-center">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6">
                        {t('aboutUs.heroTitle')}
                    </h1>
                    <p className="text-blue-100 text-lg md:text-xl max-w-2xl font-light">
                        {t('aboutUs.heroSubtitle')}
                    </p>
                </div>
            </section>

            {/* Mission Section */}
            <section className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                     <div className="grid md:grid-cols-2 gap-12 items-start">
                         <div>
                             <div className="text-blue-600 font-bold uppercase tracking-widest text-sm mb-2">{t('aboutUs.missionLabel')}</div>
                             <h2 className="text-3xl font-bold text-slate-900 leading-tight">
                                 {t('aboutUs.missionTitle')}
                             </h2>
                         </div>
                         <div>
                             <p className="text-slate-600 text-lg leading-relaxed">
                                 {t('aboutUs.missionDesc')}
                             </p>
                         </div>
                     </div>

                     {/* Values Cards */}
                     <div className="grid md:grid-cols-3 gap-8 mt-16">
                         {[
                             { titleKey: 'integrity', icon: <GlobeIcon />, descKey: 'integrityDesc' },
                             { titleKey: 'excellence', icon: <CpuChipIcon />, descKey: 'excellenceDesc' },
                             { titleKey: 'clientCentric', icon: <HeartIcon />, descKey: 'clientCentricDesc' },
                         ].map((value, idx) => (
                             <div key={idx} className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                 <div className="mb-6 bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center">
                                    {value.icon}
                                 </div>
                                 <h3 className="text-xl font-bold text-slate-900 mb-3">{t(`aboutUs.${value.titleKey}`)}</h3>
                                 <p className="text-slate-500 leading-relaxed text-sm">
                                     {t(`aboutUs.${value.descKey}`)}
                                 </p>
                             </div>
                         ))}
                     </div>
                </div>
            </section>

            {/* Stats Banner */}
            <section className="py-16 bg-blue-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-blue-500/50">
                        <div>
                            <div className="text-4xl md:text-5xl font-extrabold mb-2">9</div>
                            <div className="text-blue-200 text-sm font-medium uppercase tracking-wider">{t('aboutUs.yearsExperience')}</div>
                        </div>
                        <div>
                             <div className="text-4xl md:text-5xl font-extrabold mb-2">3</div>
                             <div className="text-blue-200 text-sm font-medium uppercase tracking-wider">{t('aboutUs.recovered')}</div>
                        </div>
                        <div>
                             <div className="text-4xl md:text-5xl font-extrabold mb-2">5+</div>
                             <div className="text-blue-200 text-sm font-medium uppercase tracking-wider">{t('aboutUs.casesWon')}</div>
                        </div>
                         <div>
                             <div className="text-4xl md:text-5xl font-extrabold mb-2">24/7</div>
                             <div className="text-blue-200 text-sm font-medium uppercase tracking-wider">{t('aboutUs.expertAttorneys')}</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* History Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="order-2 lg:order-1">
                             <div className="relative">
                                 <h2 className="text-3xl font-bold text-slate-900 mb-12">{t('aboutUs.historyTitle')}</h2>
                                 
                                 <div className="space-y-12 border-l-2 border-slate-100 pl-8 ml-4 relative">
                                     
                                     {/* Timeline Item 1 */}
                                     <div className="relative">
                                         <div className="absolute -left-[41px] top-0 w-5 h-5 bg-blue-100 rounded-full border-4 border-white flex items-center justify-center">
                                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                         </div>
                                         <div className="text-blue-600 font-bold text-sm mb-1 uppercase tracking-wider">2024</div>
                                         <h3 className="text-xl font-bold text-slate-900 mb-2">{t('aboutUs.year1998Title')}</h3>
                                         <p className="text-slate-600 text-sm leading-relaxed">
                                             {t('aboutUs.year1998Desc')}
                                         </p>
                                     </div>

                                      {/* Timeline Item 2 */}
                                      <div className="relative">
                                         <div className="absolute -left-[41px] top-0 w-5 h-5 bg-blue-100 rounded-full border-4 border-white flex items-center justify-center">
                                               <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                         </div>
                                         <div className="text-blue-600 font-bold text-sm mb-1 uppercase tracking-wider">2025</div>
                                         <h3 className="text-xl font-bold text-slate-900 mb-2">{t('aboutUs.year2010Title')}</h3>
                                         <p className="text-slate-600 text-sm leading-relaxed">
                                             {t('aboutUs.year2010Desc')}
                                         </p>
                                     </div>

                                      {/* Timeline Item 3 */}
                                      <div className="relative">
                                         <div className="absolute -left-[41px] top-0 w-5 h-5 bg-blue-100 rounded-full border-4 border-white flex items-center justify-center">
                                               <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                         </div>
                                         <div className="text-blue-600 font-bold text-sm mb-1 uppercase tracking-wider">2026</div>
                                         <h3 className="text-xl font-bold text-slate-900 mb-2">{t('aboutUs.year2023Title')}</h3>
                                         <p className="text-slate-600 text-sm leading-relaxed">
                                             {t('aboutUs.year2023Desc')}
                                         </p>
                                     </div>

                                 </div>
                             </div>
                        </div>

                        {/* Image */}
                         <div className="order-1 lg:order-2">
                            <div className="rounded-2xl overflow-hidden shadow-2xl h-[400px] lg:h-[500px]">
                                <img
                                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070"
                                    alt="Technology workspace"
                                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

             {/* Team Section */}
             <section className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('aboutUs.foundersTitle')}</h2>
                    <p className="text-slate-600 max-w-2xl mx-auto mb-16">
                        {t('aboutUs.foundersSubtitle')}
                    </p>

                    <div className="grid md:grid-cols-1 max-w-sm mx-auto gap-8">
                         {[
                             { name: t('aboutUs.founderName'), role: t('aboutUs.founderRole'), img: '/assets/harsh mohite img.png' },
                         ].map((member, idx) => (
                             <div key={idx} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all text-left group">
                                 <div className="h-64 overflow-hidden">
                                     <img src={member.img} alt={member.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                 </div>
                                 <div className="p-6">
                                     <h3 className="text-lg font-bold text-slate-900">{member.name}</h3>
                                     <div className="text-blue-600 text-sm font-medium mb-4">{member.role}</div>
                                     <p className="text-slate-500 text-xs leading-relaxed mb-4">
                                         {t('aboutUs.founderBio')}
                                     </p>
                                     <a href="#" className="text-blue-600 text-xs font-bold uppercase tracking-wider flex items-center hover:text-blue-800">
                                         {t('aboutUs.viewProfile')} <span className="ml-1">→</span>
                                     </a>
                                 </div>
                             </div>
                         ))}
                    </div>
                </div>
             </section>

             {/* Bottom CTA */}
             <section className="py-16 mx-4">
                 <div className="max-w-7xl mx-auto bg-slate-50 border border-slate-200 rounded-3xl p-8 md:p-12 text-center shadow-sm">
                     <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">{t('aboutUs.ctaTitle')}</h2>
                     <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
                         {t('aboutUs.ctaSubtitle')}
                     </p>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
                         <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                             <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                             {t('aboutUs.topRated')}
                         </div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                             <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                             {t('aboutUs.noWinNoFee')}
                         </div>
                     </div>

                     <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                         {t('aboutUs.scheduleConsultation')}
                     </button>
                 </div>
             </section>

        </div>
    );
};

export default AboutUs;
