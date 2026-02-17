import React from 'react';
import { useTranslation } from 'react-i18next';

const CTA: React.FC = () => {
    const { t } = useTranslation();

    return (
        <section className="py-20 bg-blue-600">
             <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                    {t('cta.title')}
                </h2>
                <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
                    {t('cta.subtitle')}
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button className="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                        {t('cta.bookConsultation')}
                    </button>
                    <button className="px-8 py-4 bg-transparent border-2 border-blue-400 text-white font-bold rounded-lg hover:bg-blue-700 hover:border-blue-700 transition-colors">
                        {t('cta.callUs')}
                    </button>
                </div>
            </div>
        </section>
    );
};

export default CTA;
