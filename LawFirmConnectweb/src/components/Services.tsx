import React from 'react';
import { useTranslation } from 'react-i18next';

const GridDashboardIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
);

const ChatBubbleIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const MagnifyingGlassIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const PencilEditIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const Services: React.FC = () => {
    const { t } = useTranslation();

    const services = [
        { title: t('services.corporateLaw'), description: t('services.corporateLawDesc'), icon: <GridDashboardIcon /> },
        { title: t('services.familyLaw'), description: t('services.familyLawDesc'), icon: <ChatBubbleIcon /> },
        { title: t('services.criminalDefense'), description: t('services.criminalDefenseDesc'), icon: <MagnifyingGlassIcon /> },
        { title: t('services.estatePlanning'), description: t('services.estatePlanningDesc'), icon: <PencilEditIcon /> },
    ];

    return (
        <section className="py-20" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                        {t('services.title')}
                    </h2>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <p className="text-lg max-w-2xl" style={{ color: 'var(--color-text-secondary)' }}>
                            {t('services.subtitle')}
                        </p>
                        <a href="/platform" className="hidden md:flex items-center font-semibold transition-colors gap-1" style={{ color: 'var(--color-accent)' }}>
                            {t('services.viewAll')} <span>→</span>
                        </a>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {services.map((service, index) => (
                        <div key={index} className="card-glow p-8 group cursor-pointer hover:-translate-y-1 transition-all duration-300">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-all duration-300"
                                style={{
                                    backgroundColor: 'var(--color-accent-soft)',
                                    color: 'var(--color-accent)',
                                }}
                            >
                                {service.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{service.title}</h3>
                            <p className="leading-relaxed text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                {service.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-8 md:hidden text-center">
                    <a href="/platform" className="inline-flex items-center font-semibold transition-colors gap-1" style={{ color: 'var(--color-accent)' }}>
                        {t('services.viewAll')} <span>→</span>
                    </a>
                </div>
            </div>
        </section>
    );
};

export default Services;
