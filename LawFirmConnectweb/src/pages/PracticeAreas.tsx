import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../utils/analytics';

// Icons
import { practices } from '../data/practices';

const PracticeAreas: React.FC = () => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('All Areas');

    const filters = ['All Areas', 'Corporate', 'Personal', 'Litigation', 'Real Estate'];

    const filteredPractices = practices.filter(practice => {
        const matchesSearch = practice.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              practice.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = activeFilter === 'All Areas' || practice.category === activeFilter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* Header Section */}
            <section className="bg-slate-50 pt-16 pb-12 text-center px-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                        {t('practiceAreas.title')}
                    </h1>
                    <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                        {t('practiceAreas.subtitle')}
                    </p>
                </div>
            </section>

            {/* Sticky Search & Filter Bar */}
            <div className="sticky top-20 z-40 bg-white border-y border-slate-200 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                     <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        
                        {/* Search Input */}
                        <div className="relative w-full max-w-md">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:text-sm"
                                placeholder={t('practiceAreas.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap gap-2 justify-center">
                            {filters.map(filter => {
                                const filterKey = filter.toLowerCase().replace(' ', '');
                                return (
                                    <button
                                        key={filter}
                                        onClick={() => setActiveFilter(filter)}
                                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                                            activeFilter === filter
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {t(`practiceAreas.${filterKey}`)}
                                    </button>
                                );
                            })}
                        </div>

                     </div>
                </div>
            </div>

            {/* Cards Grid */}
            <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPractices.map((practice, index) => (
                        <div key={index} className="bg-white p-8 rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300 group flex flex-col h-full">
                            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                {practice.icon}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">{practice.title}</h3>
                            <p className="text-slate-600 leading-relaxed text-sm mb-6 flex-grow">
                                {practice.description}
                            </p>
                            <Link
                                to={`/practice-areas/${practice.id}`}
                                onClick={() => trackEvent({ category: 'PracticeAreas', action: 'Click', label: `Learn More - ${practice.title}` })}
                                className="inline-flex items-center text-blue-600 font-semibold text-sm hover:text-blue-700 transition-colors"
                            >
                                {t('practiceAreas.learnMore')} <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                            </Link>
                        </div>
                    ))}
                    {filteredPractices.length === 0 && (
                        <div className="col-span-full text-center py-20 text-slate-500">
                            {t('practiceAreas.noResults')}
                        </div>
                    )}
                </div>
            </section>

             {/* Bottom CTA */}
             <section className="mt-12 mx-4 mb-20">
                 <div className="max-w-7xl mx-auto bg-blue-600 rounded-3xl p-8 md:p-12 text-center md:text-left shadow-xl shadow-blue-900/20 relative overflow-hidden">
                     <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                         <div>
                             <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{t('practiceAreas.ctaTitle')}</h2>
                             <p className="text-blue-100 text-lg max-w-xl">
                                 {t('practiceAreas.ctaSubtitle')}
                             </p>
                         </div>
                         <div className="flex gap-4 flex-shrink-0">
                             <Link
                                to="/contact"
                                onClick={() => trackEvent({ category: 'PracticeAreas', action: 'Click', label: 'Schedule Consultation' })}
                                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-lg inline-block text-center"
                             >
                                 {t('practiceAreas.scheduleConsultation')}
                             </Link>
                             <Link
                                to="/contact"
                                onClick={() => trackEvent({ category: 'PracticeAreas', action: 'Click', label: 'Contact Us Bottom' })}
                                className="bg-blue-700 text-white border border-blue-500 px-6 py-3 rounded-lg font-bold hover:bg-blue-800 transition-colors inline-block text-center"
                             >
                                 {t('practiceAreas.contactUs')}
                             </Link>
                         </div>
                     </div>
                     
                     {/* Decor */}
                     <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                     <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl -ml-32 -mb-32"></div>
                 </div>
             </section>

        </div>
    );
};

export default PracticeAreas;
