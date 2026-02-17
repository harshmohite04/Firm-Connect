import React from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { practices } from '../data/practices';
import { trackEvent } from '../utils/analytics';

const PracticeAreaDetail: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const practice = practices.find(p => p.id === id);

    if (!practice) {
        return <Navigate to="/404" replace />;
    }

    return (
        <div className="bg-slate-50 min-h-screen pt-20 pb-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Back Link */}
                <Link to="/practice-areas" className="inline-flex items-center text-slate-500 hover:text-blue-600 mb-8 transition-colors">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    {t('practiceAreaDetail.backLink')}
                </Link>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-slate-900 text-white p-8 md:p-12 relative overflow-hidden">
                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <div className="inline-block px-3 py-1 bg-blue-600/20 text-blue-200 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-500/30">
                                    {practice.category}
                                </div>
                                <h1 className="text-3xl md:text-5xl font-bold mb-4">{practice.title}</h1>
                                <p className="text-xl text-slate-300 max-w-2xl">{practice.description}</p>
                            </div>
                            <div className="hidden md:flex bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                                <div className="text-white w-12 h-12">
                                     {/* Clone element to force white color if needed, though usually they inherit currentColor */}
                                    {React.cloneElement(practice.icon as React.ReactElement<{ className?: string }>, { className: "w-12 h-12 text-blue-400" })}
                                </div>
                            </div>
                        </div>
                        
                        {/* Decor */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
                    </div>

                    {/* Content */}
                    <div className="p-8 md:p-12">
                        <div className="prose prose-slate max-w-none">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('practiceAreaDetail.overview')}</h2>
                            <p className="text-lg text-slate-600 leading-relaxed mb-8">
                                {practice.fullDescription}
                            </p>

                            <h3 className="text-xl font-bold text-slate-900 mb-4">{t('practiceAreaDetail.howWeCanHelp')}</h3>
                            <ul className="list-disc pl-5 space-y-2 text-slate-600 mb-8">
                                <li>{t('practiceAreaDetail.help1')}</li>
                                <li>{t('practiceAreaDetail.help2')}</li>
                                <li>{t('practiceAreaDetail.help3')}</li>
                                <li>{t('practiceAreaDetail.help4')}</li>
                            </ul>
                        </div>

                        {/* CTA Section */}
                        <div className="bg-blue-50 rounded-xl p-8 mt-12 border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{t('practiceAreaDetail.ctaTitle')}</h3>
                                <p className="text-slate-600">{t('practiceAreaDetail.ctaSubtitle', { area: practice.title })}</p>
                            </div>
                            <div className="flex gap-4">
                                <Link
                                    to="/contact"
                                    onClick={() => trackEvent({ category: 'PracticeDetail', action: 'Click', label: 'Schedule Consultation' })}
                                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                                >
                                    {t('practiceAreaDetail.scheduleConsultation')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PracticeAreaDetail;
