import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ScholarshipCard from '../../components/scholarships/ScholarshipCard';
import ScholarshipModal from '../../components/scholarships/ScholarshipModal';
import Modal from '../../components/shared/Modal';

export default function ScholarshipsPage() {
  const { state } = useApp();
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [minMatch, setMinMatch] = useState(0);
  const [sortBy, setSortBy] = useState('match');

  const filtered = useMemo(() => {
    let list = state.scholarships
      .filter(s => s.matchScore >= minMatch)
      .filter(s => search === '' || s.name.toLowerCase().includes(search.toLowerCase()) || s.organization.toLowerCase().includes(search.toLowerCase()));

    if (sortBy === 'match') list.sort((a, b) => b.matchScore - a.matchScore);
    else if (sortBy === 'amount') list.sort((a, b) => b.amount - a.amount);
    else if (sortBy === 'deadline') list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    return list;
  }, [state.scholarships, search, minMatch, sortBy]);

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
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(s => <ScholarshipCard key={s.id} scholarship={s} onViewDetails={setSelected} />)}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-brand-muted py-16">No scholarships match your filters. Try broadening your criteria.</p>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        <ScholarshipModal scholarship={selected} onClose={() => setSelected(null)} />
      </Modal>
    </div>
  );
}
