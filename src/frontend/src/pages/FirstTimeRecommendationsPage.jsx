import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, Wand2, LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NetworkCanvas from '../components/landing/NetworkCanvas';
import { fetchMatches } from '../services/api';

const LOCAL_USER_ID_KEY = 'scholarmatch_user_id';

function normalizeBackendTopMatch(match, index) {
  const scholarship = match?.scholarship || {};
  const rawAmount = Number(scholarship.amount ?? scholarship.value);
  const rawScore = Number(match?.match_score ?? scholarship.match_score);

  return {
    id: scholarship.id ?? `match-${index}`,
    name: scholarship.title || scholarship.name || null,
    organization: scholarship.organization || scholarship.provider || null,
    amount: Number.isFinite(rawAmount) ? rawAmount : null,
    currency: scholarship.currency || 'USD',
    deadline: scholarship.deadline || null,
    matchScore: Number.isFinite(rawScore) ? Math.round(rawScore) : null,
  };
}

function normalizeBackendAiPick(match, index) {
  const scholarship = match?.scholarship || {};
  const rawAmount = Number(scholarship.amount ?? scholarship.value);
  const rawScore = Number(match?.match_score ?? scholarship.match_score);

  return {
    id: scholarship.id ?? `ai-pick-${index}`,
    name: scholarship.title || scholarship.name || null,
    organization: scholarship.organization || scholarship.provider || null,
    amount: Number.isFinite(rawAmount) ? rawAmount : null,
    currency: scholarship.currency || 'USD',
    deadline: scholarship.deadline || null,
    matchScore: Number.isFinite(rawScore) ? Math.round(rawScore) : null,
    reason:
      (typeof match?.ai_explanation === 'string' && match.ai_explanation.trim())
      || (Array.isArray(match?.match_reasons) && match.match_reasons.length > 0 ? match.match_reasons.join(' | ') : '')
      || '!',
  };
}

function formatAmount(amount, currency) {
  if (!Number.isFinite(amount) || amount < 0) return '!';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function FirstTimeRecommendationsPage() {
  const navigate = useNavigate();
  const [topTen, setTopTen] = useState([]);
  const [loadingTopTen, setLoadingTopTen] = useState(true);
  const [topTenError, setTopTenError] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiTopThree, setAiTopThree] = useState([]);

  useEffect(() => {
    let active = true;

    const loadTopRecommendations = async () => {
      setLoadingTopTen(true);
      setTopTenError('');

      try {
        const userId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
        if (!userId) {
          throw new Error('missing_user_id');
        }

        const response = await fetchMatches(userId, false);
        const backendMatches = Array.isArray(response?.matches) ? response.matches : [];

        if (!backendMatches.length) {
          throw new Error('empty_matches');
        }

        const normalizedTopTen = backendMatches
          .map((match, index) => normalizeBackendTopMatch(match, index))
          .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
          .slice(0, 10);

        if (active) {
          setTopTen(normalizedTopTen);
        }
      } catch {
        if (active) {
          setTopTen([]);
          setTopTenError('Could not load recommendations from backend.');
        }
      } finally {
        if (active) {
          setLoadingTopTen(false);
        }
      }
    };

    loadTopRecommendations();

    return () => {
      active = false;
    };
  }, []);

  const handleRunAiSearch = async () => {
    if (loadingAi) return;

    setLoadingAi(true);
    setAiError('');

    try {
      const userId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
      if (!userId) {
        throw new Error('missing_user_id');
      }

      const response = await fetchMatches(userId, true);
      const backendMatches = Array.isArray(response?.matches) ? response.matches : [];

      const normalizedTopThree = backendMatches
        .map((match, index) => normalizeBackendAiPick(match, index))
        .sort((a, b) => (b.matchScore || -1) - (a.matchScore || -1))
        .slice(0, 3);

      setAiTopThree(normalizedTopThree);

      if (normalizedTopThree.length === 0) {
        setAiError('No AI recommendations were returned from backend.');
      }
    } catch {
      setAiTopThree([]);
      setAiError('Unable to load recommendations right now. Please try again.');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-brand-bg">
      <NetworkCanvas />
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-brand-bg/55 via-brand-bg/35 to-brand-bg/85 backdrop-blur-[4px]" />

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-16">
        <section className="glass-card border border-brand-border/50 bg-white/75 backdrop-blur-md rounded-[1.75rem] p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-xs sm:text-sm font-semibold mb-3">
                <Sparkles size={16} /> First-Time Recommendations
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-brand-text">Your Top 10 Scholarship Matches</h1>
              <p className="text-brand-muted mt-1 text-sm sm:text-base">Review your initial shortlist, then refine with AI for your best 3 opportunities.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-border/70 bg-white/85 overflow-hidden mb-6">
            <div className="grid grid-cols-[56px,1.5fr,1fr,120px,110px] gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-muted bg-brand-bg/70">
              <span>#</span>
              <span>Scholarship</span>
              <span>Organization</span>
              <span>Amount</span>
              <span>Match</span>
            </div>
            <div>
              {loadingTopTen && (
                <div className="px-4 py-5 text-sm text-brand-muted flex items-center gap-2">
                  <LoaderCircle size={16} className="animate-spin" /> Loading top recommendations...
                </div>
              )}

              {!loadingTopTen && topTen.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[56px,1.5fr,1fr,120px,110px] gap-2 px-4 py-3 border-t border-brand-border/60 items-center text-sm"
                >
                  <div className="text-brand-muted font-semibold">{index + 1}.</div>
                  <div className="font-semibold text-brand-text truncate pr-2">{item.name || '!'}</div>
                  <div className="text-brand-muted truncate pr-2">{item.organization || '!'}</div>
                  <div className="font-medium text-brand-text">{formatAmount(item.amount, item.currency)}</div>
                  <div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand-accent/15 text-brand-accent">
                      {Number.isFinite(item.matchScore) ? `${item.matchScore}%` : '!'}
                    </span>
                  </div>
                </div>
              ))}

              {!loadingTopTen && !topTen.length && (
                <div className="px-4 py-5 text-sm text-brand-muted">No recommendations available yet.</div>
              )}
            </div>
          </div>

          {topTenError && <p className="mb-4 text-sm text-brand-warning font-medium">{topTenError}</p>}

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              onClick={handleRunAiSearch}
              disabled={loadingAi}
              className="btn-primary justify-center sm:justify-start disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loadingAi ? <LoaderCircle size={18} className="animate-spin" /> : <Wand2 size={18} />}
              {loadingAi ? 'Searching with AI...' : 'Search with AI'}
            </button>

            {aiTopThree.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/dashboard/home')}
                className="btn-ghost justify-center sm:justify-start bg-white/60"
              >
                Continue to Dashboard <ArrowRight size={18} />
              </button>
            )}
          </div>

          {aiError && <p className="mt-3 text-sm text-brand-warning font-medium">{aiError}</p>}

          {aiTopThree.length > 0 && (
            <div className="mt-8 border-t border-brand-border/60 pt-6">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-brand-text mb-4">Top 3 AI Recommendations</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {aiTopThree.map((item, index) => (
                  <article key={item.id} className="glass-card p-4 border border-brand-border/70 bg-white/90 animate-fade-in-up">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted mb-2">AI Pick {index + 1}</p>
                    <h3 className="font-display font-bold text-brand-text leading-tight">{item.name || '!'}</h3>
                    <p className="text-sm text-brand-muted mt-1">{item.organization || '!'}</p>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-brand-accent font-bold">{formatAmount(item.amount, item.currency)}</span>
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-brand-accent/15 text-brand-accent">{Number.isFinite(item.matchScore) ? `${item.matchScore}%` : '!'}</span>
                    </div>

                    <p className="mt-3 text-sm text-brand-text/80 leading-relaxed">{item.reason}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
