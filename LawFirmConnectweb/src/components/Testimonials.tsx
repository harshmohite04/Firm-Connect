import React from 'react';
import { Star, Quote } from 'lucide-react';

const Testimonials: React.FC = () => {
    const testimonials = [
        {
            text: "The team at LawfirmAI handled my corporate merger with incredible attention to detail. I felt supported every step of the way.",
            author: "Michael Turner",
            role: "CEO, TechStarter",
            image: "https://randomuser.me/api/portraits/men/32.jpg"
        },
        {
            text: "Facing a difficult family situation was hard, but their compassionate approach made all the difference. Highly recommended.",
            author: "Sarah Jenkins",
            role: "Private Client",
            image: "https://randomuser.me/api/portraits/women/44.jpg"
        },
        {
            text: "Professional, aggressive, and knowledgeable. They turned a hopeless situation into a victory. I can't thank them enough.",
            author: "David Ross",
            role: "Small Business Owner",
            image: "https://randomuser.me/api/portraits/men/86.jpg"
        },
    ];

    return (
        <section className="py-24 bg-stone-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-14">
                    <p className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-3">Testimonials</p>
                    <h2 className="text-3xl lg:text-4xl font-bold text-stone-900 mb-4 text-balance">What Our Clients Say</h2>
                    <p className="text-lg text-stone-500 max-w-xl mx-auto">{'Don\'t just take our word for it. Here is what our clients have to say.'}</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {testimonials.map((testimonial, index) => (
                        <div
                            key={index}
                            className="relative bg-white p-8 rounded-2xl border border-stone-200/80 hover:border-stone-300 hover:shadow-lg hover:shadow-stone-900/5 transition-all duration-300"
                        >
                            <Quote className="w-8 h-8 text-stone-200 mb-5" />
                            
                            <div className="flex gap-0.5 mb-5">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                                ))}
                            </div>
                            
                            <p className="text-stone-600 mb-8 leading-relaxed">
                                {`"${testimonial.text}"`}
                            </p>
                            
                            <div className="flex items-center gap-3 pt-6 border-t border-stone-100">
                                <img 
                                    src={testimonial.image} 
                                    alt={testimonial.author} 
                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-stone-100"
                                />
                                <div>
                                    <div className="font-semibold text-stone-900 text-sm">{testimonial.author}</div>
                                    <div className="text-xs text-stone-400">{testimonial.role}</div>
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
