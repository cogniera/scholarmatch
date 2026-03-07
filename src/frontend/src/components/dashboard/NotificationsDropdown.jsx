import { useApp } from '../../context/AppContext';
import { Bell, AlertCircle, Lightbulb, RefreshCw, Plus } from 'lucide-react';

const typeIcons = { match: Bell, deadline: AlertCircle, tip: Lightbulb, update: RefreshCw, new: Plus };

export default function NotificationsDropdown() {
  const { state, dispatch } = useApp();

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden animate-scale-in origin-top-right z-50 border border-brand-border/50">
      <div className="px-5 py-4 border-b border-brand-border/40 flex items-center justify-between bg-brand-bg/50">
        <span className="font-display font-semibold text-brand-text">Notifications</span>
        <button onClick={() => dispatch({ type: 'MARK_NOTIFICATIONS_READ' })}
          className="text-xs font-medium text-brand-accent hover:text-brand-accentHover transition-colors">Mark all read</button>
      </div>
      <div className="max-h-80 overflow-y-auto p-3 space-y-2 bg-brand-bg/30">
        {state.notifications.map(n => {
          const Icon = typeIcons[n.type] || Bell;
          return (
            <div key={n.id} className={'p-3 rounded-xl border transition-all cursor-pointer ' + 
              (n.read ? 'bg-white border-transparent hover:border-brand-border hover:shadow-sm' : 'bg-brand-accent/5 border-brand-accent/20 shadow-sm')}>
              <div className="flex items-start gap-3">
                <div className={'p-2 rounded-lg mt-0.5 ' + (!n.read ? 'bg-brand-accent/20 text-brand-accent' : 'bg-brand-bg text-brand-muted')}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-brand-text mb-0.5 leading-tight">{n.title}</p>
                  <p className="text-xs text-brand-muted line-clamp-2 leading-relaxed">{n.description}</p>
                  <p className="text-[10px] font-medium text-brand-muted/70 mt-1.5">{n.time}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-brand-accent flex-shrink-0 mt-1.5" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
