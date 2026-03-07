import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Badge from '../../components/shared/Badge';
import ProgressBar from '../../components/shared/ProgressBar';
import { Bookmark, Send, Eye, ArrowRight } from 'lucide-react';

const tabs = ['All', 'Saved', 'Applied', 'Submitted'];

const statusVariants = {
  saved: { variant: 'muted', label: 'Saved', icon: Bookmark },
  applied: { variant: 'accent', label: 'Applied', icon: Send },
  submitted: { variant: 'success', label: 'Submitted', icon: Eye },
  'under-review': { variant: 'warning', label: 'Under Review', icon: Eye },
};

export default function ApplicationsPage() {
  const { state } = useApp();
  const [tab, setTab] = useState('All');

  // Combine saved scholarships and explicit applications
  const allApplications = [
    ...state.savedScholarships.map(id => {
      const sch = state.scholarships.find(s => s.id === id);
      const app = state.applications.find(a => a.scholarshipId === id);
      return sch ? {
        id: sch.id, name: sch.name, amount: sch.amount, deadline: sch.deadline,
        status: app?.status || 'saved', progress: app?.progress || 0,
      } : null;
    }).filter(Boolean),
    ...state.applications.filter(a => !state.savedScholarships.includes(a.scholarshipId)),
  ];

  // Deduplicate by id
  const uniqueApps = [...new Map(allApplications.map(a => [a.id, a])).values()];

  const filtered = tab === 'All' ? uniqueApps : uniqueApps.filter(a => a.status.toLowerCase() === tab.toLowerCase());

  const counts = {
    Saved: uniqueApps.filter(a => a.status === 'saved').length,
    Applied: uniqueApps.filter(a => a.status === 'applied').length,
    Submitted: uniqueApps.filter(a => ['submitted', 'under-review'].includes(a.status)).length,
  };

  return (
    <div className="animate-fade-in max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Applications</h1>
        <p className="text-brand-muted mt-1">Track your scholarship application progress.</p>
      </div>

      {/* Stats */}
      <div className="flex gap-6">
        {Object.entries(counts).map(([label, count]) => (
          <div key={label}>
            <span className="text-2xl font-display font-bold text-white">{count}</span>
            <span className="text-sm text-brand-muted ml-2">{label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-brand-surface/50 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={'px-4 py-2 rounded-md text-sm font-medium transition-all ' +
              (tab === t ? 'bg-brand-accent text-brand-bg' : 'text-brand-muted hover:text-white')}>
            {t}
          </button>
        ))}
      </div>

      {/* Application Cards */}
      <div className="space-y-4">
        {filtered.map(app => {
          const config = statusVariants[app.status] || statusVariants.saved;
          const StatusIcon = config.icon;
          return (
            <div key={app.id} className="glass-card p-5 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-display font-bold text-white text-base truncate">{app.name}</h3>
                  <Badge variant={config.variant}><StatusIcon size={12} className="mr-1" />{config.label}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-brand-muted">
                  <span className="font-medium text-brand-accent">${app.amount.toLocaleString()}</span>
                  <span>Due: {new Date(app.deadline).toLocaleDateString()}</span>
                </div>
                {app.progress > 0 && (
                  <div className="mt-2 max-w-xs"><ProgressBar value={app.progress} /></div>
                )}
              </div>
              <button className="btn-ghost text-sm flex-shrink-0">
                {app.status === 'saved' ? 'Start' : 'View'} <ArrowRight size={14} />
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-brand-muted py-16">
            No applications yet. Browse scholarships and save the ones you like!
          </p>
        )}
      </div>
    </div>
  );
}
