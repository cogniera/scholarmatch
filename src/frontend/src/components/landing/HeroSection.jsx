import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative z-10 min-h-screen flex items-center justify-center px-6 pt-20">
      <div className="max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-sm font-medium mb-8 opacity-0 animate-fade-in-up delay-0">
          <Sparkles size={16} /> Powered by Cloudinary AI
        </div>

        {/* Headline — 3 lines, large display */}
        <h1 className="font-display font-bold tracking-tight leading-[1.1] mb-8">
          <span className="block text-5xl md:text-7xl text-white opacity-0 animate-fade-in-up delay-200">
            Stop Searching.
          </span>
          <span className="block text-5xl md:text-7xl text-white opacity-0 animate-fade-in-up delay-400">
            Start Discovering.
          </span>
          <span className="block text-5xl md:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-brand-accent via-yellow-300 to-brand-accent opacity-0 animate-fade-in-up delay-600">
            Win Scholarships.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-brand-muted max-w-2xl mx-auto mb-12 leading-relaxed opacity-0 animate-fade-in-up delay-600">
          Our AI reads your resume, analyzes your profile, and maps you to scholarships
          you're statistically most likely to win — so you never miss an opportunity again.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 opacity-0 animate-fade-in-up delay-800">
          <button onClick={() => navigate('/create-profile')} className="btn-primary text-lg px-10 py-4">
            Get Started <ArrowRight size={20} />
          </button>
          <button className="btn-ghost text-lg px-10 py-4">
            See How It Works
          </button>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-0 animate-fade-in-up delay-1000">
          {[
            { value: '500+', label: 'Scholarships Indexed' },
            { value: '$2M+', label: 'Total Value Available' },
            { value: 'AI-Matched', label: 'Personalized Results' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-display font-bold text-white">{stat.value}</div>
              <div className="text-sm text-brand-muted mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
