import { ArrowRight, Sparkles } from 'lucide-react';
import NetworkCanvas from './NetworkCanvas';

const LOCAL_USER_ID_KEY = 'scholarmatch_user_id';

export default function HeroSection() {
  const handleGetStarted = () => {
    window.localStorage.removeItem(LOCAL_USER_ID_KEY);
    window.location.href = '/create-profile';
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center lg:justify-start px-6 pt-20 overflow-hidden">
      <NetworkCanvas />
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-r from-brand-bg/80 via-brand-bg/40 to-transparent" />

      <div className="relative z-10 max-w-3xl mx-auto lg:mx-0 lg:ml-[10vw] w-full mt-10 lg:mt-0">
        <div className="p-8 md:p-12 glass-card border border-brand-border/40 rounded-[2rem] shadow-2xl backdrop-blur-md bg-white/60">

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-sm font-medium mb-6 opacity-0 animate-fade-in-up delay-0">
            <Sparkles size={16} /> Powered by Gemini 3 Pro
          </div>

          <h1 className="font-display font-bold tracking-tight leading-[1.1] mb-6">
            <span className="block text-4xl md:text-6xl text-brand-text opacity-0 animate-fade-in-up delay-200">
              Stop Searching.
            </span>
            <span className="block text-4xl md:text-6xl text-brand-text opacity-0 animate-fade-in-up delay-400">
              Start Discovering.
            </span>
            <span className="block text-4xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-yellow-500 opacity-0 animate-fade-in-up delay-600">
              Win Scholarships.
            </span>
          </h1>

          <p className="text-base md:text-lg text-brand-text/80 max-w-xl mb-8 leading-relaxed opacity-0 animate-fade-in-up delay-600 font-medium tracking-wide">
            Our AI reads your resume, analyzes your profile, and maps you to scholarships
            you're statistically most likely to win — so you never miss an opportunity again.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-10 opacity-0 animate-fade-in-up delay-800">
            <button
              onClick={handleGetStarted}
              className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto justify-center shadow-brand-accent/30 shadow-lg"
            >
              Get Started <ArrowRight size={18} />
            </button>
            <button className="btn-ghost text-base px-8 py-3.5 w-full sm:w-auto justify-center bg-white/50 border border-brand-border hover:bg-white/80">
              See How It Works
            </button>
          </div>

          <div className="flex flex-wrap gap-8 opacity-0 animate-fade-in-up delay-1000">
            {[
              { value: '500+', label: 'Scholarships Indexed' },
              { value: '$2M+', label: 'Total Value Available' },
              { value: 'AI-Matched', label: 'Personalized Results' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-display font-bold text-brand-text">{stat.value}</div>
                <div className="text-xs font-semibold tracking-wider uppercase text-brand-muted mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute -bottom-8 -right-4 md:-right-12 glass-card p-4 animate-scale-in delay-1000 shadow-xl border border-brand-accent/20 bg-white/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-success/20 flex items-center justify-center">
              <Sparkles className="text-brand-success" size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-text">95% Match Found</p>
              <p className="text-xs text-brand-muted">Google Generation Scholarship</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}