import { Github, Linkedin, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-brand-border bg-brand-bg/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="font-display font-bold text-white text-lg">Scholar<span className="text-brand-accent">AI</span></span>
          <p className="text-brand-muted text-sm mt-1">Built for the Cloudinary AI Hackathon 2025</p>
          <p className="text-brand-muted/50 text-xs mt-1">MIT License</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="#" className="p-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-accent hover:border-brand-accent/30 transition-all"><Github size={18} /></a>
          <a href="#" className="p-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-accent hover:border-brand-accent/30 transition-all"><Linkedin size={18} /></a>
          <a href="#" className="p-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-accent hover:border-brand-accent/30 transition-all"><Mail size={18} /></a>
        </div>
      </div>
    </footer>
  );
}
