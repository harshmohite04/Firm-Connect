import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';


// Icons
const LocationIcon = ({ className = "w-5 h-5 flex-shrink-0" }: { className?: string }) => (
    <svg className={className} style={{ color: 'var(--color-accent)' }} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
)

const PhoneIcon = ({ className = "w-5 h-5 flex-shrink-0" }: { className?: string }) => (
    <svg className={className} style={{ color: 'var(--color-accent)' }} fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
)

const EmailIcon = ({ className = "w-5 h-5 flex-shrink-0" }: { className?: string }) => (
    <svg className={className} style={{ color: 'var(--color-accent)' }} fill="currentColor" viewBox="0 0 20 20">
        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
)

const ClockIcon = ({ className = "w-5 h-5 flex-shrink-0" }: { className?: string }) => (
    <svg className={className} style={{ color: 'var(--color-accent)' }} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
)

const ChevronDownIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} style={{ color: 'var(--color-text-tertiary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
)

const InfoIcon = ({ className = "w-5 h-5 flex-shrink-0" }: { className?: string }) => (
    <svg className={className} style={{ color: 'var(--color-accent)' }} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
)

const ContactUs: React.FC = () => {
    const { t } = useTranslation();
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus('idle');

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const res = await fetch(`${apiUrl}/contact-inquiry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Request failed');

            setStatus('success');
            setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
        } catch {
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const faqs = [
        {
            question: t('contactUs.faq1q'),
            answer: t('contactUs.faq1a')
        },
        {
            question: t('contactUs.faq2q'),
            answer: t('contactUs.faq2a')
        },
        {
            question: t('contactUs.faq3q'),
            answer: t('contactUs.faq3a')
        }
    ];

    const inputStyle: React.CSSProperties = {
        backgroundColor: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-surface-border)',
        color: 'var(--color-text-primary)',
    };

    return (
        <div className="min-h-screen relative overflow-hidden" 
             style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
            {/* Hero Section - High End Gradient */}
            <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full blur-[150px] opacity-20" style={{ backgroundColor: 'var(--color-accent)' }}></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-10" style={{ backgroundColor: 'var(--color-accent)' }}></div>
                </div>
                
                <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 text-center space-y-8 pb-12">
                     <h1 className="text-5xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tighter animate-in fade-in slide-in-from-bottom-10 duration-1000">
                        {t('contactUs.heroTitle')}
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg md:text-2xl font-medium opacity-60 leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
                        {t('contactUs.heroSubtitle')}
                    </p>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10 pb-20">
                <div className="grid lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Contact Info */}
                    <div className="lg:col-span-1 space-y-10">
                        {/* Contact Card */}
                        <div className="group rounded-[3.5rem] p-12 transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-2xl border relative overflow-hidden" 
                             style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                             <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 bg-indigo-500"></div>
                             <h2 className="text-3xl font-black mb-10 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{t('contactUs.contactInfo')}</h2>
                             
                             <div className="space-y-10">
                                 {[
                                     { icon: <LocationIcon />, label: t('contactUs.visitUs'), value: 'Pune, Maharashtra, India' },
                                     { icon: <PhoneIcon />, label: t('contactUs.callUs'), value: '+91 93568 36581' },
                                     { icon: <EmailIcon />, label: 'Email', value: 'contact@lawfirmai.com' },
                                     { icon: <ClockIcon />, label: t('contactUs.businessHours'), value: `${t('contactUs.hours')}, ${t('contactUs.hoursClosed')}` },
                                 ].map((item, i) => (
                                     <div key={i} className="flex gap-6 items-start group/item">
                                         <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover/item:scale-110 group-hover/item:rotate-6 shadow-xl"
                                              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                                             {item.icon}
                                         </div>
                                         <div className="space-y-1">
                                             <div className="text-[10px] font-black uppercase tracking-widest opacity-40">{item.label}</div>
                                             <div className="font-bold text-sm tracking-tight leading-relaxed">{item.value}</div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
 
                         {/* Map Card */}
                         <div className="rounded-[3.5rem] p-4 h-[350px] transition-all duration-500 hover:scale-[1.02] shadow-2xl border group"
                              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                             <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden">
                                 <img 
                                    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1774"
                                    alt="Map Placeholder"
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                                 />
                                 <div className="absolute inset-0 bg-indigo-900/20 group-hover:bg-transparent transition-colors"></div>
                                 <div className="absolute bottom-6 left-6 inline-flex items-center gap-3 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-110 active:scale-95" 
                                      style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-accent)' }}>
                                     <LocationIcon /> {t('contactUs.getDirections')}
                                 </div>
                             </div>
                         </div>
                    </div>

                    {/* Right Column: Form */}
                    <div className="lg:col-span-2">
                        <div className="rounded-[4rem] p-12 md:p-20 shadow-2xl border relative overflow-hidden group"
                             style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500 opacity-5 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2"></div>
                            
                            <div className="relative z-10 space-y-12">
                                <div className="space-y-4">
                                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter" style={{ color: 'var(--color-text-primary)' }}>{t('contactUs.sendMessage')}</h2>
                                    <p className="text-lg font-medium opacity-50 leading-relaxed max-w-xl">{t('contactUs.formSubtitle')}</p>
                                </div>
                                 
                                 {status === 'success' && (
                                    <div className="p-6 rounded-[2rem] text-sm font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-xl animate-in fade-in zoom-in duration-500">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500 text-white">✓</div>
                                            {t('contactUs.successMessage')}
                                        </div>
                                    </div>
                                 )}
                                 {status === 'error' && (
                                    <div className="p-6 rounded-[2rem] text-sm font-bold bg-red-500/10 text-red-500 border border-red-500/20 shadow-xl animate-in fade-in zoom-in duration-500">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500 text-white">!</div>
                                            {t('contactUs.errorMessage')}
                                        </div>
                                    </div>
                                 )}
 
                                 <form onSubmit={handleSubmit} className="space-y-10">
                                     <div className="grid md:grid-cols-2 gap-10">
                                         <div className="space-y-3">
                                             <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4 hover:opacity-100 transition-opacity" style={{ color: 'var(--color-text-primary)' }}>{t('contactUs.fullName')}</label>
                                             <input 
                                                name="name" 
                                                type="text" 
                                                required
                                                placeholder="John Doe" 
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="w-full px-8 py-5 rounded-[2rem] text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all active:scale-[0.99] border hover:border-blue-500/30"
                                                style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                                            />
                                         </div>
                                         <div className="space-y-3">
                                             <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4 hover:opacity-100 transition-opacity" style={{ color: 'var(--color-text-primary)' }}>{t('contactUs.emailAddress')}</label>
                                             <input 
                                                name="email" 
                                                type="email" 
                                                required
                                                placeholder="john@example.com" 
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full px-8 py-5 rounded-[2rem] text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all active:scale-[0.99] border hover:border-blue-500/30"
                                                style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                                            />
                                         </div>
                                     </div>
 
                                      <div className="grid md:grid-cols-2 gap-10">
                                         <div className="space-y-3">
                                             <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4 hover:opacity-100 transition-opacity" style={{ color: 'var(--color-text-primary)' }}>{t('contactUs.phone')}</label>
                                             <input 
                                                name="phone" 
                                                type="tel" 
                                                placeholder="+1 (555) 000-0000" 
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full px-8 py-5 rounded-[2rem] text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all active:scale-[0.99] border hover:border-blue-500/30"
                                                style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                                            />
                                         </div>
                                         <div className="space-y-3">
                                             <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4 hover:opacity-100 transition-opacity" style={{ color: 'var(--color-text-primary)' }}>{t('contactUs.legalMatter')}</label>
                                             <div className="relative">
                                                 <select 
                                                    name="subject" 
                                                    value={formData.subject}
                                                    onChange={handleChange}
                                                    className="w-full px-8 py-5 rounded-[2rem] text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all active:scale-[0.99] border hover:border-blue-500/30 appearance-none"
                                                    style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                                                >
                                                     <option value="">{t('contactUs.selectSubject')}</option>
                                                     <option value="Product Inquiry">{t('contactUs.corporateLaw')}</option>
                                                     <option value="Technical Support">{t('contactUs.familyLaw')}</option>
                                                     <option value="Partnership">{t('contactUs.criminalDefense')}</option>
                                                     <option value="Other">{t('contactUs.other')}</option>
                                                 </select>
                                                 <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                                     <ChevronDownIcon />
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
 
                                     <div className="space-y-3">
                                         <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-4 hover:opacity-100 transition-opacity" style={{ color: 'var(--color-text-primary)' }}>{t('contactUs.howCanWeHelp')}</label>
                                         <textarea 
                                            name="message" 
                                            required
                                            rows={6} 
                                            placeholder={t('contactUs.messagePlaceholder')} 
                                            value={formData.message}
                                            onChange={handleChange}
                                            className="w-full px-8 py-6 rounded-[2.5rem] text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all active:scale-[0.99] border hover:border-blue-500/30 resize-none"
                                            style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                                        ></textarea>
                                     </div>
 
                                     {/* Disclaimer */}
                                     <div className="rounded-[2.5rem] p-8 flex gap-6 shadow-2xl transition-all hover:scale-[1.01]" 
                                          style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-surface-border)' }}>
                                         <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-amber-400/10 text-amber-400">
                                             <InfoIcon className="w-6 h-6" />
                                         </div>
                                         <p className="text-[10px] font-black uppercase tracking-widest leading-loose opacity-60">
                                             <span className="text-amber-400">{t('contactUs.disclaimerTitle')}:</span> {t('contactUs.disclaimerText')}
                                         </p>
                                     </div>
 
                                     <div className="flex items-start gap-4 px-4">
                                         <input type="checkbox" id="privacy" required className="mt-1 w-5 h-5 rounded-lg border-2 shadow-sm cursor-pointer transition-all" style={{ accentColor: 'var(--color-accent)' }} />
                                         <label htmlFor="privacy" className="text-xs font-bold opacity-40 leading-relaxed cursor-pointer select-none hover:opacity-80 transition-opacity" style={{ color: 'var(--color-text-primary)' }}>{t('contactUs.privacyAgreement')}</label>
                                     </div>
 
                                     <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full py-6 rounded-[2.5rem] text-xs font-black uppercase tracking-widest text-white shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed group/btn"
                                        style={{ background: 'var(--gradient-accent)' }}
                                    >
                                        <div className="flex items-center justify-center gap-4">
                                            {loading ? t('contactUs.sending') : t('contactUs.submitInquiry')}
                                            {!loading && <div className="text-2xl transition-transform group-hover/btn:translate-x-2">→</div>}
                                        </div>
                                     </button>
                                 </form>
                            </div>
                        </div>
                    </div>

                </div>

                {/* FAQ Section - Glassmorphism Accordion */}
                <div className="mt-32 max-w-3xl mx-auto space-y-12">
                    <div className="text-center space-y-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: 'var(--color-accent)' }}>
                            {t('contactUs.commonQuestions')}
                        </span>
                        <h2 className="text-4xl font-black tracking-tighter" style={{ color: 'var(--color-text-primary)' }}>FAQs</h2>
                    </div>
                    
                    <div className="space-y-6">
                        {faqs.map((faq, index) => (
                            <div key={index} className="group rounded-[2.5rem] overflow-hidden transition-all duration-500 shadow-2xl border" 
                                 style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
                                <button 
                                    onClick={() => toggleFaq(index)}
                                    className="w-full flex items-center justify-between p-8 text-left transition-all hover:bg-slate-500/5"
                                >
                                    <span className="text-sm font-black tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{faq.question}</span>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${openFaq === index ? 'rotate-180 bg-indigo-500 text-white' : 'bg-slate-500/10'}`}>
                                        <ChevronDownIcon className="w-4 h-4" />
                                    </div>
                                </button>
                                <div className="overflow-hidden transition-all duration-500 ease-in-out" style={{
                                    maxHeight: openFaq === index ? '300px' : '0px',
                                    opacity: openFaq === index ? 1 : 0,
                                }}>
                                    <div className="px-8 pb-8 pt-2">
                                        <p className="text-sm font-medium leading-loose opacity-50" style={{ color: 'var(--color-text-secondary)' }}>
                                            {faq.answer}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ContactUs;
