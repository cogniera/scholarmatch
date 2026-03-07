import { useApp } from '../../context/AppContext';
import { Bell, AlertCircle, Lightbulb, RefreshCw, Plus } from 'lucide-react';

const typeIcons = { match: Bell, deadline: AlertCircle, tip: Lightbulb, update: RefreshCw, new: Plus };

export default function NotificationsDropdown() {
  const { state, dispatch } = useApp();

  return (
    <div className="absolute right-0 mt-2 w-80 glass-card rounded-xl shadow-2xl overflow-hidden animate-scale-in origin-top-right z-50">
      <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between">
        <span className="font-display font-semibold text-white text-sm">Notifications</span>
        <button onClick={() => dispatch({ type: 'MARK_NOTIFICATIONS_READ' })}
          className="text-xs text-brand-accent hover:text-brand-accentHover transition-colors">Mark all read</button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {state.notifications.map(n => {
          const Icon = typeIcons[n.type] || Bell;
          return (
            <div key={n.id} className={'px-4 py-3 hover:bg-brand-bg/50 cursor-pointer border-b border-brand-border/30 transition-colors ' + (!n.read ? 'bg-brand-accent/5' : '')}>
              <div className="flex items-start gap-3">
                <div className={'p-1.5 rounded-md ' + (!n.read ? 'bg-brand-accent/20 text-brand-accent' : 'bg-brand-surface text-brand-muted')}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  <p className="text-xs text-brand-muted mt-0.5 line-clamp-2">{n.description}</p>
                  <p className="text-[10px] text-brand-muted/60 mt-1">{n.time}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-brand-accent mt-1.5 flex-shrink-0" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
