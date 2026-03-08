import { useNavigate } from 'react-router-dom';
import { GraduationCap, DollarSign, FileText, Activity, UploadCloud, Search, Map, Bookmark } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import StatCard from '../../components/shared/StatCard';
import { useEffect, useMemo, useState } from 'react';
import { fetchMatches, fetchProfile, fetchDashboardStats, fetchUpcomingDeadlines } from '../../services/api';

function applyOrganize(list, organize) {
  if (!organize || !Array.isArray(list) || list.length === 0) return list;
  let result = [...list];
  if (organize.filterMinAmount != null && Number.isFinite(organize.filterMinAmount)) {
    result = result.filter((s) => (s.amount ?? 0) >= organize.filterMinAmount);
  }
  if (organize.filterMinMatch != null && Number.isFinite(organize.filterMinMatch)) {
    result = result.filter((s) => (s.matchScore ?? 0) >= organize.filterMinMatch);
  }
  const order = organize.order === 'asc' ? 1 : -1;
  if (organize.sortBy === 'deadline') {
    result.sort((a, b) => order * (new Date(a.deadline || '9999-12-31') - new Date(b.deadline || '9999-12-31')));
  } else if (organize.sortBy === 'amount') {
    result.sort((a, b) => order * ((a.amount ?? 0) - (b.amount ?? 0)));
  } else if (organize.sortBy === 'matchScore') {
    result.sort((a, b) => order * ((a.matchScore ?? 0) - (b.matchScore ?? 0)));
  }
  return result;
}

const LOCAL_USER_ID_KEY = 'scholarmatch_user_id';

function normalizeMatch(match, index) {
  const scholarship = match?.scholarship || {};
  const amountRaw = scholarship.amount;
  const amount = Number(amountRaw);
  const matchScoreRaw = match?.ai_match_score ?? match?.match_score;
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
    link: scholarship.link || null,
  };
}

function isValidDate(value) {
  return Boolean(value) && !Number.isNaN(new Date(value).getTime());
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [backendProfile, setBackendProfile] = useState(null);
  const [backendMatches, setBackendMatches] = useState([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  const [stats, setStats] = useState(null);
  const [deadlines, setDeadlines] = useState([]);

  useEffect(() => {
    let active = true;

    const loadDashboardData = async () => {
      if (active) setIsDashboardLoading(true);

      const userId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
      if (!userId) {
        if (active) {
          setBackendProfile(null);
          setBackendMatches([]);
          setStats(null);
          setDeadlines([]);
          setIsDashboardLoading(false);
        }
        return;
      }

      try {
        const [profile, matchesResponse, statsRes, deadlinesRes] = await Promise.all([
          fetchProfile(userId),
          fetchMatches(userId, false),
          fetchDashboardStats(userId).catch(() => null),
          fetchUpcomingDeadlines(userId, 5).catch(() => ({ deadlines: [] })),
        ]);

        if (!active) return;

        const rawMatches = Array.isArray(matchesResponse?.matches) ? matchesResponse.matches : [];
        const normalized = rawMatches.map((match, index) => normalizeMatch(match, index));
        setBackendProfile(profile || null);
        setBackendMatches(normalized);
        dispatch({ type: 'SET_SCHOLARSHIPS_FOR_CHAT', payload: normalized });
        setStats(statsRes || null);
        setDeadlines(Array.isArray(deadlinesRes?.deadlines) ? deadlinesRes.deadlines : []);
      } catch {
        if (!active) return;
        setBackendProfile(null);
        setBackendMatches([]);
        setStats(null);
        setDeadlines([]);
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

  const topMatches = useMemo(() => {
    const base = [...backendMatches].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    const organized = state.chatOrganize ? applyOrganize(base, state.chatOrganize) : base;
    return organized.slice(0, 3);
  }, [backendMatches, state.chatOrganize]);

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

  // Upcoming deadlines from API (future only, nearest first)
  const upcomingDeadlines = useMemo(() => {
    if (deadlines.length > 0) return deadlines.slice(0, 3);
    return [...backendMatches]
      .filter((s) => isValidDate(s.deadline) && new Date(s.deadline) >= new Date())
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 3);
  }, [deadlines, backendMatches]);

  // Stats from dashboard API (real DB data)
  const matchedScholarships = Number(stats?.matched_scholarships);
  const matchedScholarshipsValue = isDashboardLoading
    ? 'Loading...'
    : (Number.isFinite(matchedScholarships) ? matchedScholarships : 0);

  const totalValueMatched = Number(stats?.total_value_matched);
  const totalValueLabel = isDashboardLoading
    ? 'Loading...'
    : (Number.isFinite(totalValueMatched) && totalValueMatched > 0
      ? '$' + totalValueMatched.toLocaleString()
      : '$0');

  const applicationsStarted = Number(stats?.applications_started);
  const applicationsStartedLabel = isDashboardLoading
    ? 'Loading...'
    : (Number.isFinite(applicationsStarted) ? applicationsStarted : 0);

  const profileStrength = Number(stats?.profile_strength ?? backendProfile?.profile_strength);
  const profileStrengthLabel = isDashboardLoading
    ? 'Loading...'
    : (Number.isFinite(profileStrength) ? `${profileStrength}%` : '0%');

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
                  <p className="text-3xl font-display font-bold text-brand-danger">{s.matchScore != null ? `${s.matchScore}%` : '—'}</p>
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
                  <h3 className="text-lg font-display font-bold text-brand-text leading-tight mb-1">{s.name || '—'}</h3>
                  <p className="text-sm text-brand-muted truncate">{s.organization || '—'}</p>
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
                <span className="text-xl font-display font-bold text-brand-accent">{formatAmount(s.amount, s.currency) !== '!' ? formatAmount(s.amount, s.currency) : '$0'}</span>
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
              const nameLabel = s.name || s.title || '—';
              const organizationLabel = s.organization || s.provider || '—';
              const amountLabel = formatAmount(s.amount, s.currency) === '!' ? '$0' : formatAmount(s.amount, s.currency);
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
          <div className="py-2 text-center text-brand-muted">No upcoming deadlines</div>
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
