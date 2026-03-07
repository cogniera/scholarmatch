import { NavLink } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, Map, FileText, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ProfileAvatar from '../profile/ProfileAvatar';

const navItems = [
  { name: 'Dashboard', path: '/dashboard/home', icon: LayoutDashboard },
  { name: 'Scholarships', path: '/dashboard/scholarships', icon: GraduationCap },
  { name: 'Roadmap', path: '/dashboard/roadmap', icon: Map },
  { name: 'Applications', path: '/dashboard/applications', icon: FileText },
  { name: 'Profile', path: '/dashboard/profile', icon: User },
];

export default function Sidebar() {
  const { state } = useApp();
  const profile = state.profile;

  return (
    <aside className="w-60 bg-brand-surface/50 border-r border-brand-border flex flex-col fixed h-full z-20">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-brand-border">
        <div className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center mr-3">
          <GraduationCap size={16} className="text-brand-bg" />
        </div>
        <span className="text-lg font-display font-bold text-brand-text tracking-tight">
          Scholar<span className="text-brand-accent">AI</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ' +
              (isActive
                ? 'bg-brand-accent/10 text-brand-accent border-r-2 border-brand-accent'
                : 'text-brand-muted hover:bg-brand-bg hover:text-brand-text')
            }
          >
            <item.icon size={18} /> {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Bottom profile card */}
      {profile && (
        <div className="p-4 border-t border-brand-border">
          <div className="flex items-center gap-3 px-2">
            <ProfileAvatar publicId={state.profileImagePublicId} size={36} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-brand-text truncate">{profile.name}</p>
              <p className="text-xs text-brand-muted truncate">{profile.program}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
