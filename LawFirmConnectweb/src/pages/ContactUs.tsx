import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Icons
const LocationIcon = ({ className = "w-5 h-5 flex-shrink-0" }: { className?: string }) => (
    <svg className={className} style={{ color: 'var(--color-accent)' }} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
);

const PhoneIcon = ({ className = "w-5 h-5 flex-shrink-0" }: { className?: string }) => (
    <svg className={className} style={{ color: 'var(--color-accent)' }} fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
);

const EmailIcon = ({ className = "w-5 h-5 flex-shrink-0" }: { className?: string }) => (
    <svg className={className} style={{ color: 'var(--color-accent)' }} fill="currentColor" viewBox="0 0 20 20">
        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
);

const ClockIcon = ({ className = "w-5 h-5 flex-shrink-0" }: { className?: string }) => (
    <svg className={className} style={{ color: 'var(--color-accent)' }} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
);

const ChevronDownIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} style={{ color: 'var(--color-text-tertiary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);

const InfoIcon = ({ className = "w-5 h-5 flex-shrink-0" }: { className?: string }) => (
    <svg className={className} style={{ color: 'var(--color-accent)' }} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
);

const SparkleIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z" />
    </svg>
);

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
        { question: t('contactUs.faq1q'), answer: t('contactUs.faq1a') },
        { question: t('contactUs.faq2q'), answer: t('contactUs.faq2a') },
        { question: t('contactUs.faq3q'), answer: t('contactUs.faq3a') },
    ];

    const inputBaseClass = "w-full px-5 py-4 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all border";

    return (
        <div className="min-h-screen relative overflow-hidden"
             style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>

            {/* Hero Section */}
            <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-28 overflow-hidden" style={{ background: 'var(--gradient-hero-bg)' }}>
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, var(--color-accent-glow) 0%, transparent 70%)' }} />
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, var(--color-accent-glow) 0%, transparent 70%)' }} />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="badge-glow mb-8 mx-auto">
                        <SparkleIcon />
                        <span>GET IN TOUCH</span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                        Get in <span className="text-gradient">Touch</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg lg:text-xl font-medium leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('contactUs.heroSubtitle')}
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 pb-20">
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* Left Column: Contact Info */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Contact Card */}
                        <div className="card-surface p-8">
                            <h2 className="text-xl font-bold mb-8 tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                {t('contactUs.contactInfo')}
                            </h2>

                            <div className="space-y-6">
                                {[
                                    { icon: <LocationIcon />, label: t('contactUs.visitUs'), value: 'Pune, Maharashtra, India' },
                                    { icon: <PhoneIcon />, label: t('contactUs.callUs'), value: '+91 93568 36581' },
                                    { icon: <EmailIcon />, label: 'Email', value: 'contact@lawfirmai.com' },
                                    { icon: <ClockIcon />, label: t('contactUs.businessHours'), value: `${t('contactUs.hours')}, ${t('contactUs.hoursClosed')}` },
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4 items-start group">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                                             style={{ backgroundColor: 'var(--color-accent-soft)' }}>
                                            {item.icon}
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{item.label}</div>
                                            <div className="text-sm font-medium leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>{item.value}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Map Card */}
                        <div className="card-surface p-3 group">
                            <div className="relative w-full h-[250px] rounded-xl overflow-hidden">
                                <img
                                    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1774"
                                    alt="Map Placeholder"
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                                />
                                <div className="absolute inset-0 group-hover:bg-transparent transition-colors" style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)' }}></div>
                                <div className="absolute bottom-4 left-4">
                                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold shadow-lg"
                                          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-accent)' }}>
                                        <LocationIcon className="w-4 h-4" /> {t('contactUs.getDirections')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Form */}
                    <div className="lg:col-span-2">
                        <div className="card-surface p-8 md:p-12">
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                        {t('contactUs.sendMessage')}
                                    </h2>
                                    <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                        {t('contactUs.formSubtitle')}
                                    </p>
                                </div>

                                {status === 'success' && (
                                    <div className="p-4 rounded-xl text-sm font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500 text-white text-xs">✓</div>
                                            {t('contactUs.successMessage')}
                                        </div>
                                    </div>
                                )}
                                {status === 'error' && (
                                    <div className="p-4 rounded-xl text-sm font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500 text-white text-xs">!</div>
                                            {t('contactUs.errorMessage')}
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                                {t('contactUs.fullName')}
                                            </label>
                                            <input
                                                name="name"
                                                type="text"
                                                required
                                                placeholder="John Doe"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className={inputBaseClass}
                                                style={{
                                                    backgroundColor: 'var(--color-bg-tertiary)',
                                                    borderColor: 'var(--color-surface-border)',
                                                    color: 'var(--color-text-primary)',
                                                    '--tw-ring-color': 'var(--color-accent-glow)',
                                                } as React.CSSProperties}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                                {t('contactUs.emailAddress')}
                                            </label>
                                            <input
                                                name="email"
                                                type="email"
                                                required
                                                placeholder="john@example.com"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className={inputBaseClass}
                                                style={{
                                                    backgroundColor: 'var(--color-bg-tertiary)',
                                                    borderColor: 'var(--color-surface-border)',
                                                    color: 'var(--color-text-primary)',
                                                    '--tw-ring-color': 'var(--color-accent-glow)',
                                                } as React.CSSProperties}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                                {t('contactUs.phone')}
                                            </label>
                                            <input
                                                name="phone"
                                                type="tel"
                                                placeholder="+1 (555) 000-0000"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className={inputBaseClass}
                                                style={{
                                                    backgroundColor: 'var(--color-bg-tertiary)',
                                                    borderColor: 'var(--color-surface-border)',
                                                    color: 'var(--color-text-primary)',
                                                    '--tw-ring-color': 'var(--color-accent-glow)',
                                                } as React.CSSProperties}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                                {t('contactUs.legalMatter')}
                                            </label>
                                            <div className="relative">
                                                <select
                                                    name="subject"
                                                    value={formData.subject}
                                                    onChange={handleChange}
                                                    className={`${inputBaseClass} appearance-none`}
                                                    style={{
                                                        backgroundColor: 'var(--color-bg-tertiary)',
                                                        borderColor: 'var(--color-surface-border)',
                                                        color: 'var(--color-text-primary)',
                                                        '--tw-ring-color': 'var(--color-accent-glow)',
                                                    } as React.CSSProperties}
                                                >
                                                    <option value="">{t('contactUs.selectSubject')}</option>
                                                    <option value="Product Inquiry">{t('contactUs.corporateLaw')}</option>
                                                    <option value="Technical Support">{t('contactUs.familyLaw')}</option>
                                                    <option value="Partnership">{t('contactUs.criminalDefense')}</option>
                                                    <option value="Other">{t('contactUs.other')}</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <ChevronDownIcon className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                            {t('contactUs.howCanWeHelp')}
                                        </label>
                                        <textarea
                                            name="message"
                                            required
                                            rows={5}
                                            placeholder={t('contactUs.messagePlaceholder')}
                                            value={formData.message}
                                            onChange={handleChange}
                                            className={`${inputBaseClass} resize-none`}
                                            style={{
                                                backgroundColor: 'var(--color-bg-tertiary)',
                                                borderColor: 'var(--color-surface-border)',
                                                color: 'var(--color-text-primary)',
                                                '--tw-ring-color': 'var(--color-accent-glow)',
                                            } as React.CSSProperties}
                                        ></textarea>
                                    </div>

                                    {/* Disclaimer */}
                                    <div className="rounded-xl p-5 flex gap-4" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-surface-border)' }}>
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-400/10 text-amber-500">
                                            <InfoIcon className="w-5 h-5" />
                                        </div>
                                        <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                            <span className="text-amber-500 font-semibold">{t('contactUs.disclaimerTitle')}:</span>{' '}
                                            {t('contactUs.disclaimerText')}
                                        </p>
                                    </div>

                                    <div className="flex items-start gap-3 px-1">
                                        <input type="checkbox" id="privacy" required className="mt-1 w-4 h-4 rounded border-2 cursor-pointer" style={{ accentColor: 'var(--color-accent)' }} />
                                        <label htmlFor="privacy" className="text-xs font-medium leading-relaxed cursor-pointer select-none" style={{ color: 'var(--color-text-secondary)' }}>
                                            {t('contactUs.privacyAgreement')}
                                        </label>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full btn-gradient py-4 text-sm font-bold uppercase tracking-wider disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center justify-center gap-3">
                                            {loading ? t('contactUs.sending') : t('contactUs.submitInquiry')}
                                            {!loading && <span className="text-lg">→</span>}
                                        </div>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                </div>

                {/* FAQ Section */}
                <div className="mt-24 max-w-3xl mx-auto space-y-10">
                    <div className="text-center space-y-3">
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>
                            {t('contactUs.commonQuestions') || 'COMMON QUESTIONS'}
                        </span>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                            Frequently Asked Questions
                        </h2>
                        <p className="text-base font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                            Find quick answers to common legal inquiries.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div key={index} className="card-surface overflow-hidden">
                                <button
                                    onClick={() => toggleFaq(index)}
                                    className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-black/[0.02]"
                                >
                                    <span className="text-sm font-bold tracking-tight pr-4" style={{ color: 'var(--color-text-primary)' }}>
                                        {faq.question}
                                    </span>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${openFaq === index ? 'rotate-180' : ''}`}
                                         style={{ backgroundColor: openFaq === index ? 'var(--color-accent)' : 'var(--color-accent-soft)', color: openFaq === index ? '#fff' : 'var(--color-accent)' }}>
                                        <ChevronDownIcon className="w-4 h-4" />
                                    </div>
                                </button>
                                <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{
                                    maxHeight: openFaq === index ? '300px' : '0px',
                                    opacity: openFaq === index ? 1 : 0,
                                }}>
                                    <div className="px-5 pb-5 pt-1">
                                        <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
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
