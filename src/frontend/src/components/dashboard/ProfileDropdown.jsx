import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { User, Settings, LogOut } from 'lucide-react';
import ProfileAvatar from '../profile/ProfileAvatar';

export default function ProfileDropdown() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    navigate('/');
  };

  return (
    <div className="absolute right-0 mt-2 w-64 glass-card rounded-xl shadow-2xl py-2 animate-scale-in origin-top-right z-50">
      {state.profile && (
        <div className="px-4 py-3 border-b border-brand-border flex items-center gap-3">
          <ProfileAvatar publicId={state.profileImagePublicId} size={40} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-text truncate">{state.profile.name}</p>
            <p className="text-xs text-brand-muted truncate">{state.profile.program} • {state.profile.university}</p>
          </div>
        </div>
      )}
      <button onClick={() => navigate('/dashboard/profile')}
        className="w-full px-4 py-2.5 text-left text-sm hover:bg-brand-bg/50 flex items-center gap-2.5 text-brand-muted hover:text-brand-text transition-colors">
        <User size={16} /> Edit Profile
      </button>
      <button className="w-full px-4 py-2.5 text-left text-sm hover:bg-brand-bg/50 flex items-center gap-2.5 text-brand-muted hover:text-brand-text transition-colors">
        <Settings size={16} /> Settings
      </button>
      <div className="h-px bg-brand-border my-1" />
      <button onClick={handleLogout}
        className="w-full px-4 py-2.5 text-left text-sm hover:bg-brand-danger/10 text-brand-danger flex items-center gap-2.5 transition-colors">
        <LogOut size={16} /> Logout
      </button>
    </div>
  );
}
