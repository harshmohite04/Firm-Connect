import React from 'react';
import { useTranslation } from 'react-i18next';

const StarIcon = () => (
    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const Testimonials: React.FC = () => {
    const { t } = useTranslation();

    const testimonials = [
        {
            text: t('testimonials.testimonial1'),
            author: t('testimonials.testimonial1Author'),
            role: t('testimonials.testimonial1Role'),
            image: "https://randomuser.me/api/portraits/men/32.jpg"
        },
        {
            text: t('testimonials.testimonial2'),
            author: t('testimonials.testimonial2Author'),
            role: t('testimonials.testimonial2Role'),
            image: "https://randomuser.me/api/portraits/women/44.jpg"
        },
        {
            text: t('testimonials.testimonial3'),
            author: t('testimonials.testimonial3Author'),
            role: t('testimonials.testimonial3Role'),
            image: "https://randomuser.me/api/portraits/men/86.jpg"
        },
    ];

    return (
        <section className="py-20 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">{t('testimonials.title')}</h2>
                <p className="text-lg text-slate-600 mb-12">{t('testimonials.subtitle')}</p>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <div key={index} className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 text-left border border-slate-100">
                             <div className="flex gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <StarIcon key={i} />
                                ))}
                             </div>
                             <p className="text-slate-600 italic mb-6 leading-relaxed">
                                 "{testimonial.text}"
                             </p>
                             <div className="flex items-center gap-4">
                                 <img 
                                    src={testimonial.image} 
                                    alt={testimonial.author} 
                                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                                 />
                                 <div>
                                     <div className="font-bold text-slate-900">{testimonial.author}</div>
                                     <div className="text-sm text-slate-500">{testimonial.role}</div>
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
