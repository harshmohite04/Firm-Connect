import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import Logo from '../assets/logo.svg';

const Navbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  const links = [
    { to: '/', label: 'Home' },
    { to: '/practice-areas', label: 'Practice Areas' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/contact', label: 'Contact' },
    { to: '/about-us', label: 'About Us' },
  ];

  return (
    <nav className="w-full bg-white/90 backdrop-blur-lg sticky top-0 z-50 border-b border-stone-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2.5">
            <img src={Logo} alt="LawfirmAI Logo" className="w-20 h-20" />
            <span className="font-bold text-xl tracking-tight text-stone-900">LawfirmAI</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.to
                    ? 'text-stone-900 bg-stone-100'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/signin"
              className="inline-flex items-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-stone-800 transition-all"
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-stone-200/60 bg-white animate-fade-in">
          <div className="px-4 py-4 flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.to
                    ? 'text-stone-900 bg-stone-100'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 mt-2 border-t border-stone-100">
              <Link
                to="/signin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 bg-stone-900 text-white px-5 py-3 rounded-lg text-sm font-semibold hover:bg-stone-800 transition-all"
              >
                Sign In
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
