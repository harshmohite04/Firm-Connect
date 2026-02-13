import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, TrendingUp } from 'lucide-react';
import { trackEvent } from '../utils/analytics';

const Hero: React.FC = () => {
    return (
        <section className="relative bg-stone-50 pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
                    
                    {/* Left Content */}
                    <div className="max-w-xl animate-fade-in-up">
                        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white border border-stone-200 mb-8 shadow-sm">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                            <span className="text-xs font-semibold text-stone-600 tracking-wide uppercase">Trusted Since 1995</span>
                        </div>
                        
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-stone-900 leading-[1.08] mb-8 tracking-tight text-balance">
                            Defending Your Rights with Integrity
                        </h1>
                        
                        <p className="text-lg text-stone-500 mb-10 leading-relaxed max-w-md">
                            Top-tier legal representation for complex litigation, corporate law, and personal matters. We fight for the justice you deserve.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-3 mb-12">
                            <Link 
                                to="/contact" 
                                onClick={() => trackEvent({ category: 'Hero', action: 'Click', label: 'Get Legal Help' })}
                                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-stone-900 text-white font-semibold rounded-xl hover:bg-stone-800 transition-all text-center"
                            >
                                Get Legal Help
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link 
                                to="/practice-areas" 
                                onClick={() => trackEvent({ category: 'Hero', action: 'Click', label: 'Learn More' })}
                                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-white text-stone-700 border border-stone-200 font-semibold rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-all text-center"
                            >
                                Explore Services
                            </Link>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-5 text-sm font-medium text-stone-500">
                            <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                </span>
                                Free Initial Consultation
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                </span>
                                No Win, No Fee
                            </div>
                        </div>
                    </div>

                    {/* Right Image */}
                    <div className="relative lg:ml-auto w-full max-w-lg lg:max-w-none animate-slide-in-right">
                        <div className="relative rounded-2xl overflow-hidden bg-stone-200 aspect-[4/3] lg:aspect-auto lg:h-[560px] shadow-2xl shadow-stone-900/10">
                            <img 
                                src="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&q=80&w=1974" 
                                alt="Legal Team Meeting" 
                                className="object-cover w-full h-full"
                            />
                            
                            {/* Floating Card */}
                            <div className="absolute bottom-5 left-5 right-5 sm:right-auto bg-white/95 backdrop-blur-md p-5 rounded-xl shadow-lg border border-stone-100 max-w-xs">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-stone-900">98%</div>
                                        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Case Success Rate</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
