import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail } from 'lucide-react';
import Logo from '../assets/logo.svg';

const Footer: React.FC = () => {
    return (
        <footer className="bg-stone-950 text-stone-400 pt-16 pb-8 text-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-14">
                     
                    <div className="col-span-2 lg:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <img src={Logo} alt="LawfirmAI Logo" className="w-16 h-16" />
                            <span className="font-bold text-lg text-white">LawfirmAI</span>
                        </div>
                        <p className="text-stone-500 leading-relaxed max-w-xs mb-6">
                            Dedicated to providing exceptional legal representation with a personal touch. Your justice is our priority.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="w-9 h-9 rounded-lg bg-stone-900 flex items-center justify-center text-stone-500 hover:bg-stone-800 hover:text-white transition-colors" aria-label="Facebook">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path></svg>
                            </a>
                            <a href="#" className="w-9 h-9 rounded-lg bg-stone-900 flex items-center justify-center text-stone-500 hover:bg-stone-800 hover:text-white transition-colors" aria-label="Twitter">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path></svg>
                            </a>
                            <a href="#" className="w-9 h-9 rounded-lg bg-stone-900 flex items-center justify-center text-stone-500 hover:bg-stone-800 hover:text-white transition-colors" aria-label="LinkedIn">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"></path><circle cx="4" cy="4" r="2"></circle></svg>
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-5 text-xs uppercase tracking-wider">Practice Areas</h4>
                        <ul className="flex flex-col gap-3">
                            <li><Link to="/practice-areas" className="hover:text-white transition-colors">Corporate Law</Link></li>
                            <li><Link to="/practice-areas" className="hover:text-white transition-colors">Real Estate</Link></li>
                            <li><Link to="/practice-areas" className="hover:text-white transition-colors">Family Law</Link></li>
                            <li><Link to="/practice-areas" className="hover:text-white transition-colors">Criminal Defense</Link></li>
                            <li><Link to="/practice-areas" className="hover:text-white transition-colors">Intellectual Property</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-5 text-xs uppercase tracking-wider">Company</h4>
                        <ul className="flex flex-col gap-3">
                            <li><Link to="/about-us" className="hover:text-white transition-colors">About Us</Link></li>
                            <li><a href="#" className="hover:text-white transition-colors">Attorneys</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                            <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-5 text-xs uppercase tracking-wider">Contact Us</h4>
                        <ul className="flex flex-col gap-4">
                            <li className="flex gap-3 items-start">
                                <MapPin className="w-4 h-4 text-stone-600 flex-shrink-0 mt-0.5" />
                                <span>Pune, Maharashtra, India</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <Phone className="w-4 h-4 text-stone-600 flex-shrink-0 mt-0.5" />
                                <span>+91 93568 36581</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <Mail className="w-4 h-4 text-stone-600 flex-shrink-0 mt-0.5" />
                                <span>contact@lawfirmai.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-stone-800/60 flex flex-col md:flex-row justify-between items-center gap-4 text-stone-600 text-xs">
                    <span>{'© 2026 LawfirmAI. All rights reserved.'}</span>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-stone-400 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-stone-400 transition-colors">Terms of Service</a>
                    </div>
                </div>
                <div className="mt-6 text-center text-xs text-stone-700">
                    Attorney Advertising. Prior results do not guarantee a similar outcome.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
