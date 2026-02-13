import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Users, ShieldAlert, FileText, ArrowRight } from 'lucide-react';

const Services: React.FC = () => {
    const services = [
        {
            title: 'Corporate Law',
            description: 'Expert guidance on mergers, acquisitions, and compliance for businesses of all sizes.',
            icon: <Briefcase className="w-6 h-6" />,
        },
        {
            title: 'Family Law',
            description: 'Compassionate support for divorce, custody, and adoption proceedings.',
            icon: <Users className="w-6 h-6" />,
        },
        {
            title: 'Criminal Defense',
            description: 'Aggressive defense strategies to protect your rights against all criminal charges.',
            icon: <ShieldAlert className="w-6 h-6" />,
        },
        {
            title: 'Estate Planning',
            description: 'Secure your legacy with comprehensive wills, trusts, and estate management.',
            icon: <FileText className="w-6 h-6" />,
        },
    ];

    return (
        <section id="practices" className="py-24 bg-stone-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-14">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <p className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-3">What We Do</p>
                            <h2 className="text-3xl lg:text-4xl font-bold text-stone-900 text-balance">Specialized Legal Services</h2>
                        </div>
                        <Link 
                            to="/practice-areas"
                            className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-stone-900 hover:text-stone-600 transition-colors"
                        >
                            View All Areas
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <p className="mt-4 text-lg text-stone-500 max-w-2xl">
                        We offer comprehensive legal support across multiple disciplines, tailored to your unique situation.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {services.map((service, index) => (
                        <div
                            key={index}
                            className="group bg-white p-7 rounded-2xl border border-stone-200/80 hover:border-stone-300 hover:shadow-lg hover:shadow-stone-900/5 transition-all duration-300 cursor-pointer"
                        >
                            <div className="w-12 h-12 bg-stone-900 rounded-xl flex items-center justify-center mb-6 text-white group-hover:bg-stone-800 transition-colors duration-300">
                                {service.icon}
                            </div>
                            <h3 className="text-lg font-bold text-stone-900 mb-2">{service.title}</h3>
                            <p className="text-stone-500 leading-relaxed text-sm mb-5">
                                {service.description}
                            </p>
                            <div className="flex items-center gap-1.5 text-sm font-medium text-stone-400 group-hover:text-stone-900 transition-colors">
                                Learn more
                                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 md:hidden text-center">
                    <Link 
                        to="/practice-areas"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-stone-900 hover:text-stone-600 transition-colors"
                    >
                        View All Areas
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default Services;
