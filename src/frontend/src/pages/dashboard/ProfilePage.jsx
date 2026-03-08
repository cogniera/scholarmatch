import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import ProfileAvatar from '../../components/profile/ProfileAvatar';
import ProgressBar from '../../components/shared/ProgressBar';
import ResumeUploader from '../../components/profile/ResumeUploader';
import { MapPin, BookOpen, GraduationCap, Calendar, Briefcase, Award, UploadCloud } from 'lucide-react';
import { fetchProfile } from '../../services/api';

const LOCAL_USER_ID_KEY = 'scholarmatch_user_id';

export default function ProfilePage() {
  const { state } = useApp();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (active) {
        setLoading(true);
        setLoadError('');
      }

      try {
        const userId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
        if (!userId) {
          throw new Error('missing_user_id');
        }

        const response = await fetchProfile(userId);
        if (active) {
          setProfile(response || null);
        }
      } catch {
        if (active) {
          setProfile(null);
          setLoadError('Unable to load profile from backend right now.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const profileStrength = Number(profile?.profile_strength);
  const profileStrengthLabel = loading
    ? 'Loading...'
    : (Number.isFinite(profileStrength) ? `${profileStrength}%` : '!');
  const profileStrengthValue = Number.isFinite(profileStrength) ? profileStrength : 0;

  const suggestions = useMemo(() => {
    if (loading) return ['Loading profile suggestions...'];

    const list = [];
    if (!profile?.transcript_url) list.push('Upload an official transcript to verify your GPA.');
    if (!state.profileImagePublicId) list.push('Add a profile photo for a more complete profile.');
    if (!profile?.extracurriculars) list.push('List your extracurricular activities in your profile.');
    return list.length > 0 ? list : ['Your backend profile looks complete.'];
  }, [loading, profile, state.profileImagePublicId]);

  const gpaLabel = Number.isFinite(Number(profile?.gpa)) ? Number(profile.gpa).toFixed(1) : '!';
  const academicLevelLabel = profile?.academic_level || '!';
  const locationLabel = profile?.location || '!';
  const universityLabel = profile?.university || '!';
  const programLabel = profile?.program || '!';
  const extracurricularsLabel = profile?.extracurriculars || '!';
  const careerInterestsLabel = Array.isArray(profile?.career_interests)
    ? (profile.career_interests.join(', ') || '!')
    : (profile?.career_interests || '!');
  const profileName = loading ? 'Loading...' : (profile?.name || '!');
  const emailLabel = profile?.email || '!';

  return (
    <div className="animate-fade-in max-w-5xl space-y-8">
      <h1 className="text-3xl font-display font-bold text-brand-text">Profile</h1>

      {loadError && (
        <p className="text-sm text-brand-warning font-medium">{loadError}</p>
      )}

      {/* Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Photo + Identity */}
        <div className="glass-card p-6 flex flex-col items-center text-center">
          <ProfileAvatar publicId={state.profileImagePublicId} size={120} className="mb-4" />
          <h2 className="text-xl font-display font-bold text-brand-text">{profileName}</h2>
          <p className="text-sm text-brand-muted">{programLabel}</p>
          <p className="text-xs text-brand-muted">{emailLabel}</p>
          <div className="w-full mt-6 pt-6 border-t border-brand-border">
            <p className="text-xs text-brand-muted mb-2">Profile Strength</p>
            <div className="flex items-center gap-3">
              <ProgressBar value={profileStrengthValue} color="brand-accent" />
              <span className="text-sm font-bold text-brand-accent">{profileStrengthLabel}</span>
            </div>
          </div>
        </div>

        {/* Right Column — Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Grid */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-brand-text mb-4">Academic Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { icon: Award, label: 'GPA', value: gpaLabel },
                { icon: Calendar, label: 'Academic Level', value: academicLevelLabel },
                { icon: MapPin, label: 'Location', value: locationLabel },
                { icon: GraduationCap, label: 'University', value: universityLabel },
                { icon: BookOpen, label: 'Program', value: programLabel },
                { icon: Briefcase, label: 'Extracurriculars', value: extracurricularsLabel },
                { icon: Briefcase, label: 'Career Interests', value: careerInterestsLabel },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="p-2 bg-brand-surface rounded-lg"><item.icon size={16} className="text-brand-muted" /></div>
                  <div><p className="text-xs text-brand-muted">{item.label}</p><p className="text-sm font-medium text-brand-text">{item.value}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Resume */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-brand-text mb-4 flex items-center gap-2">
              <UploadCloud size={18} className="text-brand-accent" /> Resume
            </h3>
            <ResumeUploader />
          </div>

          {/* Suggestions */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-brand-text mb-4">Improve Your Profile</h3>
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
