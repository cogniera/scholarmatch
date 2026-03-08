import { useNavigate } from 'react-router-dom';
import { GraduationCap, DollarSign, FileText, Activity, UploadCloud, Search, Map, Bookmark } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import StatCard from '../../components/shared/StatCard';
import { useEffect, useMemo, useState } from 'react';
import { fetchMatches, fetchProfile } from '../../services/api';

const LOCAL_USER_ID_KEY = 'scholarmatch_user_id';

function normalizeMatch(match, index) {
  const scholarship = match?.scholarship || {};
  const amountRaw = scholarship.amount;
  const amount = Number(amountRaw);
  const matchScoreRaw = match?.match_score;
  const matchScore = Number(matchScoreRaw);

  return {
    id: scholarship.id ?? `match-${index}`,
    name: typeof scholarship.title === 'string' && scholarship.title.trim() ? scholarship.title.trim() : null,
    organization: typeof scholarship.provider === 'string' && scholarship.provider.trim() ? scholarship.provider.trim() : null,
    amount: Number.isFinite(amount) ? amount : null,
    currency: scholarship.currency || 'USD',
    deadline: scholarship.deadline || null,
    matchScore: Number.isFinite(matchScore) ? Math.round(matchScore) : null,
    tags: [scholarship.program, scholarship.academic_level, scholarship.location].filter(Boolean),
    logoUrl: 'https://res.cloudinary.com/demo/image/upload/c_thumb,w_80,h_80,r_max/cld-sample-2',
  };
}

function isValidDate(value) {
  return Boolean(value) && !Number.isNaN(new Date(value).getTime());
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const { state } = useApp();
  const [backendProfile, setBackendProfile] = useState(null);
  const [backendMatches, setBackendMatches] = useState([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadDashboardData = async () => {
      if (active) setIsDashboardLoading(true);

      const userId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
      if (!userId) {
        if (active) {
          setBackendProfile(null);
          setBackendMatches([]);
          setIsDashboardLoading(false);
        }
        return;
      }

      try {
        const [profile, matchesResponse] = await Promise.all([
          fetchProfile(userId),
          fetchMatches(userId, false),
        ]);

        if (!active) return;

        const rawMatches = Array.isArray(matchesResponse?.matches) ? matchesResponse.matches : [];
        setBackendProfile(profile || null);
        setBackendMatches(rawMatches.map((match, index) => normalizeMatch(match, index)));
      } catch {
        if (!active) return;
        setBackendProfile(null);
        setBackendMatches([]);
      } finally {
        if (active) {
          setIsDashboardLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      active = false;
    };
  }, []);

  const topMatches = useMemo(
    () => [...backendMatches].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)).slice(0, 3),
    [backendMatches],
  );

  const topMatchCards = useMemo(() => {
    const cards = [...topMatches];
    while (cards.length < 3) {
      cards.push({
        id: `placeholder-${cards.length}`,
        name: null,
        organization: null,
        amount: null,
        currency: 'USD',
        deadline: null,
        matchScore: null,
        tags: [],
      });
    }
    return cards;
  }, [topMatches]);

  const upcomingDeadlines = useMemo(
    () => [...backendMatches]
      .filter((s) => isValidDate(s.deadline))
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 3),
    [backendMatches],
  );

  // Stats are backend-field driven only; if backend does not provide these values, show '!'.
  const matchedScholarships = Number(backendProfile?.matched_scholarships);
  const matchedScholarshipsValue = isDashboardLoading
    ? 'Loading...'
    : (Number.isFinite(matchedScholarships) ? matchedScholarships : '!');

  const totalValueMatched = Number(backendProfile?.total_value_matched);
  const totalValueLabel = isDashboardLoading
    ? 'Loading...'
    : (Number.isFinite(totalValueMatched) && totalValueMatched > 0
      ? '$' + totalValueMatched.toLocaleString()
      : '!');

  const applicationsStarted = Number(backendProfile?.applications_started);
  const applicationsStartedLabel = isDashboardLoading
    ? 'Loading...'
    : (Number.isFinite(applicationsStarted) ? applicationsStarted : '!');

  const profileStrength = Number(backendProfile?.profile_strength);
  const profileStrengthLabel = isDashboardLoading
    ? 'Loading...'
    : (Number.isFinite(profileStrength) ? `${profileStrength}%` : '!');

  const formatAmount = (amount, currency = 'USD') => {
    if (!Number.isFinite(amount) || amount < 0) return '!';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDueDate = (deadline) => {
    if (!isValidDate(deadline)) return '!';
    return new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
        <StatCard title="Matched Scholarships" value={matchedScholarshipsValue} icon={GraduationCap} />
        <StatCard title="Total Value Matched" value={totalValueLabel} icon={DollarSign} />
        <StatCard title="Applications Started" value={applicationsStartedLabel} icon={FileText} />
        <StatCard title="Profile Strength" value={profileStrengthLabel} icon={Activity} />
      </div>

      {/* Recommended */}
      <div>
        <h2 className="text-xl font-display font-semibold text-brand-text mb-4">Top AI Matches</h2>
        {isDashboardLoading ? (
          <div className="glass-card p-8 text-center text-brand-muted font-medium">Loading top matches...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {topMatchCards.map((s) => (
            <article key={s.id} className="glass-card p-6 relative flex flex-col h-full">
              <div className="flex justify-between items-start mb-2 mt-[-0.5rem] mx-[-0.5rem]">
                <div className="p-2 rounded-md text-brand-muted">
                  <Bookmark size={20} />
                </div>

                <div className="text-right">
                  <p className="text-3xl font-display font-bold text-brand-danger">{s.matchScore ?? '!'}</p>
                  <p className="text-sm font-semibold tracking-wide text-brand-muted">MATCH</p>
                </div>
              </div>

              <div className="flex items-start gap-4 mb-4 mt-2">
                <img
                  src={s.logoUrl || 'https://res.cloudinary.com/demo/image/upload/c_thumb,w_80,h_80,r_max/cld-sample-2'}
                  alt={s.organization || '!'}
                  className="w-12 h-12 rounded-xl object-cover shadow-sm shrink-0"
                />
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-lg font-display font-bold text-brand-text leading-tight mb-1">{s.name || '!'}</h3>
                  <p className="text-sm text-brand-muted truncate">{s.organization || '!'}</p>
                </div>
              </div>

              <div className="flex gap-2 mb-5 flex-wrap">
                {s.tags && s.tags.length > 0 ? (
                  s.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-brand-bg border border-brand-border text-brand-muted font-medium">{tag}</span>
                  ))
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-brand-bg border border-brand-border text-brand-muted font-medium">!</span>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-brand-border/50 mt-auto">
                <span className="text-xl font-display font-bold text-brand-accent">{formatAmount(s.amount, s.currency)}</span>
                <span className="text-sm font-medium text-brand-muted bg-brand-bg px-3 py-1 rounded-md">Due: {formatDueDate(s.deadline)}</span>
              </div>
            </article>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Deadlines */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-display font-semibold text-brand-text mb-4">Upcoming Deadlines</h2>
        {isDashboardLoading ? (
          <div className="py-2 text-brand-muted font-medium">Loading deadlines...</div>
        ) : upcomingDeadlines.length > 0 ? (
          <div className="space-y-3">
            {upcomingDeadlines.map(s => {
              const daysLeft = Math.max(0, Math.ceil((new Date(s.deadline) - new Date()) / (1000 * 60 * 60 * 24)));
              const nameLabel = s.name || '!';
              const organizationLabel = s.organization || '!';
              const amountLabel = formatAmount(s.amount, s.currency);
              return (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-brand-border/30 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-brand-text">{nameLabel}</p>
                    <p className="text-xs text-brand-muted">{amountLabel} | {organizationLabel}</p>
                  </div>
                  <span className={'text-xs font-semibold px-2.5 py-1 rounded-full ' + (daysLeft < 30 ? 'bg-brand-danger/10 text-brand-danger' : 'bg-brand-warning/10 text-brand-warning')}>
                    {daysLeft}d left
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-2 text-center text-3xl font-display font-bold text-brand-text">!</div>
        )}
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
    </div>
  );
}
