import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Menu, X } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={'fixed w-full z-50 top-0 transition-all duration-300 ' +
      (scrolled ? 'bg-brand-bg/80 backdrop-blur-lg border-b border-brand-border' : 'bg-transparent')}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-lg bg-brand-accent flex items-center justify-center">
            <GraduationCap size={20} className="text-brand-bg" />
          </div>
          <span className="text-xl font-display font-bold tracking-tight text-brand-text">
            Scholar<span className="text-brand-accent">Match</span>
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#about" className="text-sm font-medium text-brand-muted hover:text-brand-text transition-colors">About Us</a>
          <a href="#contact" className="text-sm font-medium text-brand-muted hover:text-brand-text transition-colors">Contact Us</a>
          <button onClick={() => navigate('/create-profile')} className="btn-primary text-sm">
            Get Started
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button className="md:hidden text-brand-text" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-brand-surface/95 backdrop-blur-xl border-t border-brand-border px-6 py-6 space-y-4 animate-fade-in">
          <a href="#about" className="block text-brand-muted hover:text-brand-text transition-colors">About Us</a>
          <a href="#contact" className="block text-brand-muted hover:text-brand-text transition-colors">Contact Us</a>
          <button onClick={() => { navigate('/create-profile'); setMobileOpen(false); }} className="btn-primary w-full justify-center text-sm">
            Get Started
          </button>
        </div>
      )}
    </nav>
  );
}
