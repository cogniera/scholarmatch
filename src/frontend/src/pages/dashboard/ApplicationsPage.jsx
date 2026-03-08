import { useMemo, useState, useEffect } from 'react';
import Badge from '../../components/shared/Badge';
import ProgressBar from '../../components/shared/ProgressBar';
import { Bookmark, Send, Eye, ArrowRight } from 'lucide-react';
import { fetchMatches } from '../../services/api';

const tabs = ['All', 'Saved', 'Applied', 'Submitted'];
const LOCAL_USER_ID_KEY = 'scholarmatch_user_id';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const statusVariants = {
  saved: { variant: 'muted', label: 'Saved', icon: Bookmark },
  applied: { variant: 'accent', label: 'Applied', icon: Send },
  submitted: { variant: 'success', label: 'Submitted', icon: Eye },
  'under-review': { variant: 'warning', label: 'Under Review', icon: Eye },
  '!': { variant: 'muted', label: '!', icon: Eye },
};

export default function ApplicationsPage() {
  const [tab, setTab] = useState('All');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isFilling, setIsFilling] = useState(false);

  useEffect(() => {
    let active = true;

    const loadApplications = async () => {
      if (active) {
        setLoading(true);
        setLoadError('');
      }

      try {
        const userId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
        if (!userId) {
          throw new Error('missing_user_id');
        }

        const response = await fetchMatches(userId, false);
        const matches = Array.isArray(response?.matches) ? response.matches : [];

        const normalized = matches.map((item, index) => {
          const scholarship = item?.scholarship || {};
          const amount = Number(scholarship.amount);
          const progress = Number(item?.application_progress);

          return {
            id: scholarship.id ?? `app-${index}`,
            name: scholarship.title || '—',
            amount: Number.isFinite(amount) ? amount : null,
            deadline: scholarship.deadline || null,
            link: scholarship.link || null,
            status: typeof item?.application_status === 'string' && item.application_status.trim()
              ? item.application_status.trim().toLowerCase()
              : 'saved',
            progress: Number.isFinite(progress) ? progress : 0,
          };
        });

        if (active) {
          setApplications(normalized);
        }
      } catch {
        if (active) {
          setApplications([]);
          setLoadError('Unable to load applications from backend right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadApplications();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () => tab === 'All' ? applications : applications.filter(a => a.status.toLowerCase() === tab.toLowerCase()),
    [applications, tab],
  );

  const counts = {
    Saved: applications.filter(a => a.status === 'saved').length,
    Applied: applications.filter(a => a.status === 'applied').length,
    Submitted: applications.filter(a => ['submitted', 'under-review'].includes(a.status)).length,
  };

  const formatAmount = (amount) => (Number.isFinite(amount) ? `$${amount.toLocaleString()}` : '!');
  const formatDeadline = (deadline) => (deadline ? new Date(deadline).toLocaleDateString() : '!');

  const handleFillWithAI = async () => {
    if (isFilling) return;
    setIsFilling(true);
    try {
      await fetch(`${API_BASE_URL}/automation/rbc-ignite`, {
        method: 'POST',
      });
      // Optional: you could add a toast/notification here.
    } catch (err) {
      console.error('Failed to trigger automation', err);
    } finally {
      setIsFilling(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-brand-text">Applications</h1>
        <p className="text-brand-muted mt-1">Track your scholarship application progress.</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6">
        {Object.entries(counts).map(([label, count]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-2xl font-display font-bold text-brand-text">
              {loading ? 'Loading...' : count}
            </span>
            <span className="text-sm text-brand-muted">{label}</span>
            {label === 'Submitted' && (
              <button
                type="button"
                onClick={handleFillWithAI}
                className="btn-primary text-xs py-1 px-3"
                disabled={isFilling}
              >
                {isFilling ? 'Filling…' : 'Fill with AI'}
              </button>
            )}
          </div>
        ))}
      </div>

      {loadError && (
        <p className="text-sm text-brand-warning font-medium">{loadError}</p>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-brand-surface/50 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={'px-4 py-2 rounded-md text-sm font-medium transition-all ' +
              (tab === t ? 'bg-brand-accent text-brand-bg' : 'text-brand-muted hover:text-brand-text')}>
            {t}
          </button>
        ))}
      </div>

      {/* Application Cards */}
      <div className="space-y-4">
        {loading && (
          <div className="glass-card p-5 text-brand-muted font-medium">Loading applications from backend...</div>
        )}

        {filtered.map(app => {
          const config = statusVariants[app.status] || statusVariants['!'];
          const StatusIcon = config.icon;
          const viewUrl = app.link || '#';
          return (
            <div key={app.id} className="glass-card p-5 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-display font-bold text-brand-text text-base truncate">{app.name || '—'}</h3>
                  <Badge variant={config.variant}>
                    <StatusIcon size={12} className="mr-1" />
                    {config.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-brand-muted">
                  <span className="font-medium text-brand-accent">{formatAmount(app.amount)}</span>
                  <span>Due: {formatDeadline(app.deadline)}</span>
                </div>
                {app.progress > 0 && (
                  <div className="mt-2 max-w-xs"><ProgressBar value={app.progress} /></div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-sm"
                >
                  {app.status === 'saved' ? 'Start' : 'View'} <ArrowRight size={14} />
                </a>
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-brand-muted py-16">
            No applications yet. Browse scholarships and save the ones you like!
          </p>
        )}
      </div>
    </div>
  );
}
