import React from 'react';
import { ShieldCheck, Trophy, Heart } from 'lucide-react';

const features = [
    {
        icon: <ShieldCheck className="w-5 h-5 text-white" />,
        title: 'Unwavering Integrity',
        description: 'We operate with complete transparency and ethical standards in every case we handle.',
    },
    {
        icon: <Trophy className="w-5 h-5 text-white" />,
        title: 'Proven Track Record',
        description: 'Our history of successful settlements and verdicts speaks for itself.',
    },
    {
        icon: <Heart className="w-5 h-5 text-white" />,
        title: 'Client-Centric Approach',
        description: 'You are not just a case number. We provide personalized attention to your unique needs.',
    },
];

const WhyChooseUs: React.FC = () => {
    return (
        <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                    
                    {/* Image Side */}
                    <div className="relative order-2 lg:order-1">
                        <div className="relative rounded-2xl overflow-hidden h-[520px] shadow-2xl shadow-stone-900/10">
                            <img 
                                src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=1974" 
                                alt="Interior of a courthouse" 
                                className="object-cover w-full h-full"
                            />
                            
                            {/* Quote Overlay */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-900/95 via-stone-900/70 to-transparent p-8 pt-28">
                                <blockquote className="text-xl sm:text-2xl italic leading-relaxed mb-3 text-white/90 font-serif">
                                    {'"Justice consists not in being neutral between right and wrong, but in finding out the right and upholding it."'}
                                </blockquote>
                                <cite className="text-sm font-semibold tracking-wider uppercase not-italic text-stone-400">
                                    {'-- Theodore Roosevelt'}
                                </cite>
                            </div>
                        </div>
                    </div>

                    {/* Content Side */}
                    <div className="order-1 lg:order-2">
                        <p className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-3">Why Us</p>
                        <h2 className="text-3xl lg:text-4xl font-bold text-stone-900 mb-5 text-balance">
                            Why Choose LawfirmAI?
                        </h2>
                        <p className="text-lg text-stone-500 mb-10 leading-relaxed">
                            We bring a unique combination of deep legal expertise and a personal commitment to every client's well-being.
                        </p>

                        <div className="flex flex-col gap-8">
                            {features.map((feature, index) => (
                                <div key={index} className="flex gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center mt-0.5">
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-stone-900 mb-1.5">{feature.title}</h3>
                                        <p className="text-stone-500 leading-relaxed text-sm">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default WhyChooseUs;
