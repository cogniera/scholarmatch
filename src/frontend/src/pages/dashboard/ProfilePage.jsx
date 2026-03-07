import { useApp } from '../../context/AppContext';
import ProfileAvatar from '../../components/profile/ProfileAvatar';
import ProgressBar from '../../components/shared/ProgressBar';
import ResumeUploader from '../../components/profile/ResumeUploader';
import { getResumePreviewUrl } from '../../cloudinary/transformations';
import { MapPin, BookOpen, GraduationCap, Calendar, Briefcase, Award, UploadCloud } from 'lucide-react';

export default function ProfilePage() {
  const { state } = useApp();
  const profile = state.profile || {};

  const profileStrength = 72; // mock
  const suggestions = [
    'Upload an official transcript to verify your GPA.',
    'Add a profile photo for a more complete profile.',
    'List your extracurricular activities.',
  ];

  return (
    <div className="animate-fade-in max-w-5xl space-y-8">
      <h1 className="text-3xl font-display font-bold text-white">Profile</h1>

      {/* Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Photo + Identity */}
        <div className="glass-card p-6 flex flex-col items-center text-center">
          <ProfileAvatar publicId={state.profileImagePublicId} size={120} className="mb-4" />
          <h2 className="text-xl font-display font-bold text-white">{profile.name || 'Student'}</h2>
          <p className="text-sm text-brand-muted">{profile.program}</p>
          <p className="text-xs text-brand-muted">{profile.university}</p>
          <div className="w-full mt-6 pt-6 border-t border-brand-border">
            <p className="text-xs text-brand-muted mb-2">Profile Strength</p>
            <div className="flex items-center gap-3">
              <ProgressBar value={profileStrength} color="brand-accent" />
              <span className="text-sm font-bold text-brand-accent">{profileStrength}%</span>
            </div>
          </div>
        </div>

        {/* Right Column — Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Grid */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-white mb-4">Academic Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { icon: Award, label: 'GPA', value: profile.gpa?.toFixed(1) || 'N/A' },
                { icon: Calendar, label: 'Year', value: profile.year || 'N/A' },
                { icon: MapPin, label: 'Location', value: profile.location || 'N/A' },
                { icon: GraduationCap, label: 'University', value: profile.university || 'N/A' },
                { icon: BookOpen, label: 'Program', value: profile.program || 'N/A' },
                { icon: Briefcase, label: 'Career Interests', value: profile.careerInterests?.join(', ') || 'N/A' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="p-2 bg-brand-surface rounded-lg"><item.icon size={16} className="text-brand-muted" /></div>
                  <div><p className="text-xs text-brand-muted">{item.label}</p><p className="text-sm font-medium text-white">{item.value}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Resume */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
              <UploadCloud size={18} className="text-brand-accent" /> Resume
            </h3>
            <ResumeUploader />
          </div>

          {/* Suggestions */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-white mb-4">Improve Your Profile</h3>
            <ul className="space-y-2">
              {suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-brand-muted">
                  <span className="text-brand-accent mt-0.5">→</span> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
