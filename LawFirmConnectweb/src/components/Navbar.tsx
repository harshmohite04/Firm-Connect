import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import Logo from '../assets/logo.svg';

const SunIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const MoonIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);

const Navbar: React.FC = () => {
    const { t } = useTranslation();
    const { isDark, toggleTheme } = useTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const location = useLocation();
    const menuRef = useRef<HTMLDivElement>(null);

    // Track scroll for backdrop effect
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMobileMenuOpen(false);
            }
        };
        if (isMobileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobileMenuOpen]);

    const navLinks = [
        { to: '/', label: t('nav.home') },
        { to: '/platform', label: t('nav.platform') },
        { to: '/pricing', label: t('nav.pricing') },
        { to: '/about-us', label: t('nav.aboutUs') },
        { to: '/contact', label: t('nav.contact') },
    ];

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav
            ref={menuRef}
            className="w-full sticky top-0 z-50 transition-all duration-300"
            style={{
                backgroundColor: isScrolled ? 'var(--color-nav-bg)' : 'transparent',
                backdropFilter: isScrolled ? 'blur(20px)' : 'none',
                WebkitBackdropFilter: isScrolled ? 'blur(20px)' : 'none',
                borderBottom: isScrolled ? '1px solid var(--color-nav-border)' : '1px solid transparent',
            }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">

                    {/* Logo */}
                    <Link to="/" className="flex-shrink-0 flex items-center gap-3 cursor-pointer group">
                        <div className="rounded-lg">
                            <img src={Logo} alt="LawFirmAI" style={{ width: '3.5rem', height: '3.5rem' }} className="transition-transform duration-300 group-hover:scale-105" />
                        </div>
                        <span className="font-bold text-xl tracking-tight" style={{ color: 'var(--color-text-primary)' }}>LawFirmAI</span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                                style={{
                                    color: isActive(link.to) ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                    backgroundColor: isActive(link.to) ? 'var(--color-accent-soft)' : 'transparent',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive(link.to)) {
                                        e.currentTarget.style.color = 'var(--color-accent)';
                                        e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive(link.to)) {
                                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                {link.label}
                            </Link>
                        ))}

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 ml-2 rounded-xl transition-all duration-200 cursor-pointer"
                            style={{
                                color: 'var(--color-text-secondary)',
                                backgroundColor: 'var(--color-accent-soft)',
                            }}
                            aria-label="Toggle theme"
                        >
                            {isDark ? <SunIcon /> : <MoonIcon />}
                        </button>

                        {/* Sign In Button */}
                        <Link to="/signin" className="btn-gradient ml-3 !py-2.5 !px-6 text-sm inline-flex items-center gap-2">
                            {t('nav.signIn')}
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                    </div>

                    {/* Mobile Controls */}
                    <div className="md:hidden flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: 'var(--color-text-secondary)' }}
                            aria-label="Toggle theme"
                        >
                            {isDark ? <SunIcon /> : <MoonIcon />}
                        </button>
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: 'var(--color-text-secondary)' }}
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? (
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>

                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            <div
                className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
                    isMobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="px-4 pt-2 pb-4 space-y-1" style={{ backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-surface-border)' }}>
                    {navLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className="block px-4 py-3 rounded-xl text-base font-medium transition-all"
                            style={{
                                color: isActive(link.to) ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                backgroundColor: isActive(link.to) ? 'var(--color-accent-soft)' : 'transparent',
                            }}
                        >
                            {link.label}
                        </Link>
                    ))}
                    <Link
                        to="/signin"
                        className="btn-gradient block mt-3 text-center text-sm"
                    >
                        {t('nav.signIn')}
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
