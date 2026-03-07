import { Bookmark } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import MatchScoreBadge from './MatchScoreBadge';

export default function ScholarshipCard({ scholarship, onViewDetails }) {
  const { state, dispatch } = useApp();
  const isSaved = state.savedScholarships.includes(scholarship.id);

  const toggleSave = (e) => {
    e.stopPropagation();
    dispatch({ type: isSaved ? 'UNSAVE_SCHOLARSHIP' : 'SAVE_SCHOLARSHIP', payload: scholarship.id });
  };

  return (
    <div onClick={() => onViewDetails(scholarship)}
      className="glass-card-hover p-5 cursor-pointer relative group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <img src={scholarship.logoUrl} alt={scholarship.organization} className="w-10 h-10 rounded-lg object-cover" />
          <div>
            <h3 className="text-base font-display font-bold text-white group-hover:text-brand-accent transition-colors">{scholarship.name}</h3>
            <p className="text-xs text-brand-muted">{scholarship.organization}</p>
          </div>
        </div>
        <MatchScoreBadge score={scholarship.matchScore} />
      </div>

      <div className="flex items-center gap-4 mt-4">
        <span className="text-lg font-display font-bold text-brand-accent">
          ${scholarship.amount.toLocaleString()}
          <span className="text-xs font-body text-brand-muted ml-1">{scholarship.currency}</span>
        </span>
        <span className="text-xs text-brand-muted">Due: {new Date(scholarship.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>

      <div className="flex gap-1.5 mt-3 flex-wrap">
        {scholarship.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-bg border border-brand-border text-brand-muted">{tag}</span>
        ))}
      </div>

      {/* Save bookmark */}
      <button onClick={toggleSave}
        className={'absolute top-4 right-4 p-1.5 rounded-md transition-colors ' + (isSaved ? 'text-brand-accent bg-brand-accent/10' : 'text-brand-muted hover:text-brand-accent')}>
        <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
