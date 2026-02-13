import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';

const CTA: React.FC = () => {
    return (
        <section className="py-24 bg-stone-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">Get Started</p>
                <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6 text-balance">
                    Ready to Discuss Your Case?
                </h2>
                <p className="text-lg text-stone-400 mb-10 max-w-xl mx-auto leading-relaxed">
                    Schedule your free initial consultation today. Our team is ready to listen and provide the guidance you need.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Link
                        to="/contact"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-stone-900 font-semibold rounded-xl hover:bg-stone-100 transition-colors"
                    >
                        Book Free Consultation
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                    <a
                        href="tel:+915551234567"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent border border-stone-700 text-stone-300 font-semibold rounded-xl hover:bg-stone-800 hover:border-stone-600 hover:text-white transition-colors"
                    >
                        <Phone className="w-4 h-4" />
                        Call (555) 123-4567
                    </a>
                </div>
            </div>
        </section>
    );
};

export default CTA;
