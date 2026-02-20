import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from '../assets/logo.svg';
import LanguageSwitcher from './LanguageSwitcher';

// Simple SVG Icons


const Navbar: React.FC = () => {
  const { t } = useTranslation();

  return (
    <nav className="w-full bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-3 cursor-pointer">
            <div className="rounded-lg">
               {/* <LogoIcon /> */}
               <img src={Logo} alt="" style={{ width: '6rem', height: '6rem' }}/>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">LawfirmAI</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">{t('nav.home')}</Link>
            <Link to="/practice-areas" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">{t('nav.practiceAreas')}</Link>
            <Link to="/pricing" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">{t('nav.pricing')}</Link>
            <Link to="/contact" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">{t('nav.contact')}</Link>
            <Link to="/platform" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">{t('nav.platform')}</Link>
            <Link to="/about-us" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">{t('nav.aboutUs')}</Link>
            
            <LanguageSwitcher variant="navbar" />

            <Link to="/signin" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
              {t('nav.signIn')}
            </Link>
          </div>

          {/* Mobile Menu Button (Placeholder) */}
          <div className="md:hidden flex items-center">
            <button className="p-2 rounded-md text-gray-500 hover:text-gray-900 focus:outline-none">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
