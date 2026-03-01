import React from 'react';
import { useTranslation } from 'react-i18next';

const StarIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#FBBF24' }}>
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const QuoteIcon = () => (
    <svg className="w-8 h-8 opacity-20" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-accent)' }}>
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H0z" />
    </svg>
);

const Testimonials: React.FC = () => {
    const { t } = useTranslation();

    const testimonials = [
        {
            text: t('testimonials.testimonial1'),
            author: t('testimonials.testimonial1Author'),
            role: t('testimonials.testimonial1Role'),
            initials: 'RS',
        },
        {
            text: t('testimonials.testimonial2'),
            author: t('testimonials.testimonial2Author'),
            role: t('testimonials.testimonial2Role'),
            initials: 'PD',
        },
        {
            text: t('testimonials.testimonial3'),
            author: t('testimonials.testimonial3Author'),
            role: t('testimonials.testimonial3Role'),
            initials: 'VP',
        },
    ];

    return (
        <section className="py-20" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                    {t('testimonials.title')}
                </h2>
                <p className="text-lg mb-12" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('testimonials.subtitle')}
                </p>

                <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {testimonials.map((testimonial, index) => (
                        <div key={index} className="card-glow p-8 text-left relative group hover:-translate-y-1 transition-all duration-300">
                            {/* Quote decoration */}
                            <div className="absolute top-6 right-6">
                                <QuoteIcon />
                            </div>

                            {/* Stars */}
                            <div className="flex gap-1 mb-5">
                                {[...Array(5)].map((_, i) => (
                                    <StarIcon key={i} />
                                ))}
                            </div>

                            {/* Quote text */}
                            <p className="mb-6 leading-relaxed text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                "{testimonial.text}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--color-surface-border)' }}>
                                <div
                                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                    style={{ background: 'var(--gradient-accent)' }}
                                >
                                    {testimonial.initials}
                                </div>
                                <div>
                                    <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{testimonial.author}</div>
                                    <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{testimonial.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
