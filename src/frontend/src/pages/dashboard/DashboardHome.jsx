import { useNavigate } from 'react-router-dom';
import { GraduationCap, DollarSign, FileText, Activity, ArrowRight, UploadCloud, Search, Map } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import StatCard from '../../components/shared/StatCard';
import ScholarshipCard from '../../components/scholarships/ScholarshipCard';
import ScholarshipModal from '../../components/scholarships/ScholarshipModal';
import Modal from '../../components/shared/Modal';
import { useState } from 'react';

export default function DashboardHome() {
  const navigate = useNavigate();
  const { state } = useApp();
  const [selected, setSelected] = useState(null);

  const topMatches = [...state.scholarships].sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
  const totalValue = topMatches.reduce((sum, s) => sum + s.amount, 0);
  const upcomingDeadlines = [...state.scholarships].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 3);

  return (
    <div className="animate-fade-in space-y-8 max-w-6xl">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-display font-bold text-brand-text">
          Welcome back, <span className="text-brand-accent">{state.profile?.name || 'Scholar'}</span>
        </h1>
        <p className="text-brand-muted mt-1">Here's your scholarship landscape today.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Matched Scholarships" value={state.scholarships.length} icon={GraduationCap} trend="+3 new" />
        <StatCard title="Total Value Matched" value={'$' + totalValue.toLocaleString()} icon={DollarSign} />
        <StatCard title="Applications Started" value={state.applications.length} icon={FileText} />
        <StatCard title="Profile Strength" value="72%" icon={Activity} />
      </div>

      {/* Recommended */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-display font-semibold text-brand-text">Top AI Matches</h2>
          <button onClick={() => navigate('/dashboard/scholarships')} className="text-sm text-brand-accent hover:text-brand-accentHover flex items-center gap-1 transition-colors">
            See All <ArrowRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {topMatches.map(s => <ScholarshipCard key={s.id} scholarship={s} onViewDetails={setSelected} />)}
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-display font-semibold text-brand-text mb-4">Upcoming Deadlines</h2>
        <div className="space-y-3">
          {upcomingDeadlines.map(s => {
            const daysLeft = Math.max(0, Math.ceil((new Date(s.deadline) - new Date()) / (1000 * 60 * 60 * 24)));
            return (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-brand-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium text-brand-text">{s.name}</p>
                  <p className="text-xs text-brand-muted">${s.amount.toLocaleString()} • {s.organization}</p>
                </div>
                <span className={'text-xs font-semibold px-2.5 py-1 rounded-full ' + (daysLeft < 30 ? 'bg-brand-danger/10 text-brand-danger' : 'bg-brand-warning/10 text-brand-warning')}>
                  {daysLeft}d left
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-display font-semibold text-brand-text mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button onClick={() => navigate('/dashboard/profile')} className="glass-card-hover p-5 flex items-center gap-3 text-left">
            <div className="w-10 h-10 text-brand-accent bg-brand-accent/10 rounded-lg flex items-center justify-center"><UploadCloud size={20} /></div>
            <div><p className="text-sm font-medium text-brand-text">Upload Document</p><p className="text-xs text-brand-muted">Resume, transcript, or letter</p></div>
          </button>
          <button onClick={() => navigate('/dashboard/scholarships')} className="glass-card-hover p-5 flex items-center gap-3 text-left">
            <div className="w-10 h-10 text-brand-accent bg-brand-accent/10 rounded-lg flex items-center justify-center"><Search size={20} /></div>
            <div><p className="text-sm font-medium text-brand-text">Browse Scholarships</p><p className="text-xs text-brand-muted">Explore AI recommendations</p></div>
          </button>
          <button onClick={() => navigate('/dashboard/roadmap')} className="glass-card-hover p-5 flex items-center gap-3 text-left">
            <div className="w-10 h-10 text-brand-accent bg-brand-accent/10 rounded-lg flex items-center justify-center"><Map size={20} /></div>
            <div><p className="text-sm font-medium text-brand-text">View Roadmap</p><p className="text-xs text-brand-muted">Gap analysis & next steps</p></div>
          </button>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        <ScholarshipModal scholarship={selected} onClose={() => setSelected(null)} />
      </Modal>
    </div>
  );
}
