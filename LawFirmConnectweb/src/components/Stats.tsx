import React from 'react';
import { useTranslation } from 'react-i18next';

const icons = [
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
];

const Stats: React.FC = () => {
    const { t } = useTranslation();

    const stats = [
        { value: '9', label: t('stats.experience'), icon: icons[0] },
        { value: '3', label: t('stats.casesWon'), icon: icons[1] },
        { value: '5+', label: t('stats.attorneys'), icon: icons[2] },
        { value: '24/7', label: t('stats.support'), icon: icons[3] },
    ];

    return (
        <section className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className="card-glow p-6 text-center group cursor-default"
                            style={{ borderTop: '3px solid var(--color-accent)' }}
                        >
                            <div className="flex items-center justify-center mb-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                                    {stat.icon}
                                </div>
                            </div>
                            <div className="text-3xl lg:text-4xl font-extrabold mb-1 group-hover:scale-105 transition-transform duration-300" style={{ color: 'var(--color-text-primary)' }}>
                                {stat.value}
                            </div>
                            <div className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Stats;
