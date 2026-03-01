import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CTA: React.FC = () => {
    const { t } = useTranslation();

    return (
        <section className="py-20 relative overflow-hidden" style={{ background: 'var(--gradient-cta)' }}>
            {/* Decorative elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-white/5 blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-white/5 blur-3xl"></div>
                <div className="absolute top-1/2 left-10 w-4 h-4 rounded-full bg-white/20"></div>
                <div className="absolute top-1/3 right-20 w-3 h-3 rounded-full bg-white/15"></div>
                <div className="absolute bottom-1/3 left-1/3 w-2 h-2 rounded-full bg-white/25"></div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                    {t('cta.title')}
                </h2>
                <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
                    {t('cta.subtitle')}
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Link
                        to="/pricing"
                        className="px-8 py-4 bg-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-center"
                        style={{ color: 'var(--color-accent)' }}
                    >
                        {t('cta.bookConsultation')}
                    </Link>
                    <Link
                        to="/contact"
                        className="px-8 py-4 bg-transparent border-2 border-white/40 text-white font-bold rounded-xl hover:bg-white/10 transition-all text-center"
                    >
                        {t('cta.callUs')}
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default CTA;
