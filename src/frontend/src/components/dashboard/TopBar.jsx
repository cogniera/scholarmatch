import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import NotificationsDropdown from './NotificationsDropdown';
import ProfileDropdown from './ProfileDropdown';
import ProfileAvatar from '../profile/ProfileAvatar';

export default function TopBar() {
  const { state } = useApp();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const unreadCount = state.notifications.filter(n => !n.read).length;

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-20 border-b border-brand-border bg-brand-bg/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-end px-8 gap-4">
      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}
          className="p-2.5 hover:bg-brand-surface rounded-lg transition-colors relative text-brand-muted hover:text-brand-text">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-brand-accent text-brand-bg text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        {showNotif && <NotificationsDropdown />}
      </div>

      {/* Profile */}
      <div className="relative" ref={profileRef}>
        <button onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
          className="flex items-center gap-3 hover:bg-brand-surface py-1.5 px-3 rounded-lg transition-colors">
          <ProfileAvatar publicId={state.profileImagePublicId} size={32} />
          {state.profile && (
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-brand-text leading-tight">{state.profile.name}</p>
              <p className="text-xs text-brand-muted leading-tight">{state.profile.program}</p>
            </div>
          )}
        </button>
        {showProfile && <ProfileDropdown />}
      </div>
    </header>
  );
}
