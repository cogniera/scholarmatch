import { useState, useMemo, useEffect } from 'react';
import { Search, SlidersHorizontal, Wand2, LoaderCircle } from 'lucide-react';
import ScholarshipCard from '../../components/scholarships/ScholarshipCard';
import ScholarshipModal from '../../components/scholarships/ScholarshipModal';
import Modal from '../../components/shared/Modal';
import { fetchMatches } from '../../services/api';

const LOCAL_USER_ID_KEY = 'scholarmatch_user_id';

function normalizeMatchForUi(match, index) {
  const scholarship = match?.scholarship || {};
  const amount = Number(scholarship.amount);
  const score = Number(match?.ai_match_score ?? match?.match_score);

  return {
    id: scholarship.id ?? `match-${index}`,
    name: scholarship.title || '!',
    organization: scholarship.provider || '!',
    amount: Number.isFinite(amount) ? amount : 0,
    currency: scholarship.currency || 'USD',
    deadline: scholarship.deadline || null,
    logoUrl: 'https://res.cloudinary.com/demo/image/upload/c_thumb,w_80,h_80,r_max/cld-sample-2',
    bannerUrl: 'https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_450,g_auto,f_auto/cld-sample-4',
    videoUrl: null,
    matchScore: Number.isFinite(score) ? Math.round(score) : 0,
    tags: [scholarship.program, scholarship.academic_level, scholarship.location].filter(Boolean),
    aiAnalysis: {
      whyYouQualify: Array.isArray(match?.match_reasons) ? match.match_reasons : [],
      aiExplanation: match?.ai_explanation || '',
      eligibilityReason: match?.eligibility_reason || '',
    },
    scoreComponents: match?.score_components || null,
    nextSteps: Array.isArray(match?.next_steps) ? match.next_steps : [],
    overallRecommendation: match?.overall_recommendation || null,
    applicationUrl: scholarship.link || '#',
    requiredDocuments: [],
  };
}

export default function ScholarshipsPage() {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [minMatch, setMinMatch] = useState(0);
  const [sortBy, setSortBy] = useState('match');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    let active = true;

    const loadMatches = async () => {
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
        const raw = Array.isArray(response?.matches) ? response.matches : [];
        const normalized = raw.map((item, index) => normalizeMatchForUi(item, index));

        if (active) {
          setMatches(normalized);
        }
      } catch {
        if (active) {
          setMatches([]);
          setLoadError('Unable to load scholarships from backend right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadMatches();

    return () => {
      active = false;
    };
  }, []);

  const handleRefineWithAi = async () => {
    const userId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
    if (!userId || loadingAi) return;
    setLoadingAi(true);
    setLoadError('');
    try {
      const response = await fetchMatches(userId, true);
      const raw = Array.isArray(response?.matches) ? response.matches : [];
      const normalized = raw.map((item, index) => normalizeMatchForUi(item, index));
      setMatches(normalized);
    } catch {
      setLoadError('AI refinement failed. Please try again.');
    } finally {
      setLoadingAi(false);
    }
  };

  const filtered = useMemo(() => {
    let list = [...matches]
      .filter(s => s.matchScore >= minMatch)
      .filter(s => search === '' || (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.organization || '').toLowerCase().includes(search.toLowerCase()));

    if (sortBy === 'match') list.sort((a, b) => b.matchScore - a.matchScore);
    else if (sortBy === 'amount') list.sort((a, b) => b.amount - a.amount);
    else if (sortBy === 'deadline') list.sort((a, b) => new Date(a.deadline || '9999-12-31') - new Date(b.deadline || '9999-12-31'));

    return list;
  }, [matches, search, minMatch, sortBy]);

  return (
    <div className="animate-fade-in max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-brand-text">Scholarships</h1>
        <p className="text-brand-muted mt-1">AI-curated matches based on your profile.</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 text-brand-muted" size={16} />
          <input type="text" className="input-field pl-10" placeholder="Search scholarships..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-brand-muted" />
          <select className="input-field w-auto text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="match">Sort: Match Score</option>
            <option value="amount">Sort: Amount</option>
            <option value="deadline">Sort: Deadline</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-brand-muted">Min Match:</span>
          <select className="input-field w-auto text-sm" value={minMatch} onChange={e => setMinMatch(Number(e.target.value))}>
            <option value={0}>All</option>
            <option value={60}>60%+</option>
            <option value={80}>80%+</option>
            <option value={90}>90%+</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleRefineWithAi}
          disabled={loadingAi || matches.length === 0}
          className="btn-primary text-sm py-2 px-4 disabled:opacity-60"
        >
          {loadingAi ? <LoaderCircle size={16} className="animate-spin" /> : <Wand2 size={16} />}
          {loadingAi ? ' Refining with AI...' : ' Refine with AI'}
        </button>
      </div>

      {loadError && (
        <p className="text-sm text-brand-warning font-medium">{loadError}</p>
      )}

      {loading && (
        <div className="glass-card p-6 text-brand-muted font-medium">Loading scholarships from backend...</div>
      )}

      {/* Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(s => <ScholarshipCard key={s.id} scholarship={s} onViewDetails={setSelected} />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-center text-brand-muted py-16">No scholarships match your filters. Try broadening your criteria.</p>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        <ScholarshipModal scholarship={selected} onClose={() => setSelected(null)} />
      </Modal>
    </div>
  );
}
