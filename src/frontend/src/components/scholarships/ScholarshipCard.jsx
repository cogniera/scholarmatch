import { Bookmark } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import MatchScoreBadge from './MatchScoreBadge';

export default function ScholarshipCard({ scholarship, onViewDetails }) {
  const { state, dispatch } = useApp();
  const isSaved = state.savedScholarships.includes(scholarship.id);
  const tags = Array.isArray(scholarship.tags) ? scholarship.tags : [];
  const amountLabel = Number.isFinite(Number(scholarship.amount))
    ? `$${Number(scholarship.amount).toLocaleString()}`
    : '!';
  const dueLabel = scholarship.deadline
    ? new Date(scholarship.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '!';

  const toggleSave = (e) => {
    e.stopPropagation();
    dispatch({ type: isSaved ? 'UNSAVE_SCHOLARSHIP' : 'SAVE_SCHOLARSHIP', payload: scholarship.id });
  };

  return (
    <div onClick={() => onViewDetails(scholarship)}
      className="glass-card-hover p-6 cursor-pointer relative group flex flex-col h-full">

      {/* Top Section Container: ensures title/source don't affect bottom alignment */}
      <div className="flex-1 flex flex-col">
        {/* Header row: Bookmark (Left), Match Badge (Right) */}
        <div className="flex justify-between items-start mb-2 mt-[-0.5rem] mx-[-0.5rem]">
          <button onClick={toggleSave}
            className={'p-2 rounded-md transition-colors ' + (isSaved ? 'text-brand-accent bg-brand-accent/10' : 'text-brand-muted hover:text-brand-accent hover:bg-brand-bg')}>
            <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
          </button>

          <div>
            <MatchScoreBadge score={scholarship.matchScore} />
          </div>
        </div>

        {/* Card Body */}
        <div className="flex items-start gap-4 mb-4">
          <img src={scholarship.logoUrl || scholarship.logo_url} alt={scholarship.organization} className="w-12 h-12 rounded-xl object-cover shadow-sm shrink-0" />
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-lg font-display font-bold text-brand-text group-hover:text-brand-accent transition-colors leading-tight mb-1">{scholarship.name || '!'}</h3>
            <p className="text-sm text-brand-muted">{scholarship.organization || '!'}</p>
          </div>
        </div>
      </div>

      {/* Bottom Section: Categories & Footer strictly aligned */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-brand-bg border border-brand-border text-brand-muted font-medium">{tag}</span>
        ))}
        {tags.length === 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-brand-bg border border-brand-border text-brand-muted font-medium">!</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-brand-border/50">
        <span className="text-xl font-display font-bold text-brand-accent">
          {amountLabel}
        </span>
        <span className="text-sm font-medium text-brand-muted bg-brand-bg px-3 py-1 rounded-md">
          Due: {dueLabel}
        </span>
      </div>
    </div>
  );
}
