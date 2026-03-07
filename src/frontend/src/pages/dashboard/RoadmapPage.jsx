import { useApp } from '../../context/AppContext';
import ProgressBar from '../../components/shared/ProgressBar';
import { Lock, CheckCircle2, Loader2, DollarSign, Target } from 'lucide-react';

const statusConfig = {
  complete: { icon: CheckCircle2, label: 'Complete', color: 'text-brand-success', badge: 'bg-brand-success/10 text-brand-success' },
  'in-progress': { icon: Loader2, label: 'In Progress', color: 'text-brand-accent', badge: 'bg-brand-accent/10 text-brand-accent' },
  locked: { icon: Lock, label: 'Locked', color: 'text-brand-muted', badge: 'bg-brand-surface text-brand-muted' },
};

export default function RoadmapPage() {
  const { state } = useApp();
  const totalUnlockable = state.roadmapSteps.reduce((sum, s) => sum + s.unlockValue, 0);
  const qualifiedScholarships = state.scholarships.filter(s => s.matchScore >= 80);
  const qualifiedValue = qualifiedScholarships.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="animate-fade-in max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-brand-text">Scholarship Roadmap</h1>
        <p className="text-brand-muted mt-1">Unlock your full scholarship potential with these steps.</p>
      </div>

      {/* Gap Analysis Summary */}
      <div className="glass-card p-6 border-brand-accent/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-brand-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Target className="text-brand-accent" size={24} />
          </div>
          <div>
            <h3 className="font-display font-bold text-brand-text text-lg">
              You qualify for {qualifiedScholarships.length} scholarships worth ${qualifiedValue.toLocaleString()}
            </h3>
            <p className="text-brand-muted text-sm mt-1">
              Complete the steps below to unlock <span className="text-brand-accent font-semibold">{state.roadmapSteps.reduce((s, r) => s + r.unlockCount, 0)} more scholarships</span> worth up to <span className="text-brand-accent font-semibold">${totalUnlockable.toLocaleString()}</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-brand-border" />

        <div className="space-y-6">
          {state.roadmapSteps.map((step, idx) => {
            const config = statusConfig[step.status];
            const Icon = config.icon;
            return (
              <div key={step.id} className="relative">
                {/* Dot on timeline */}
                <div className={'absolute -left-5 w-6 h-6 rounded-full flex items-center justify-center border-2 ' +
                  (step.status === 'complete' ? 'bg-brand-success border-brand-success' :
                    step.status === 'in-progress' ? 'bg-brand-accent/20 border-brand-accent' : 'bg-brand-surface border-brand-border')}>
                  <Icon size={12} className={config.color} />
                </div>

                <div className={'glass-card p-5 ml-4 ' + (step.status === 'locked' ? 'opacity-60' : '')}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={'text-xs px-2 py-0.5 rounded-full font-semibold ' + config.badge}>{config.label}</span>
                        <span className="text-xs text-brand-muted">Step {idx + 1}</span>
                      </div>
                      <h3 className="font-display font-bold text-brand-text text-base">{step.title}</h3>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="flex items-center gap-1 text-brand-accent">
                        <DollarSign size={14} />
                        <span className="font-display font-bold text-sm">${step.unlockValue.toLocaleString()}</span>
                      </div>
                      <span className="text-[10px] text-brand-muted">{step.unlockCount} scholarships</span>
                    </div>
                  </div>
                  <p className="text-sm text-brand-muted mb-3">{step.description}</p>
                  {step.status === 'in-progress' && (
                    <ProgressBar value={step.progress} color="brand-accent" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
