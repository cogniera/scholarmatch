import { useEffect, useMemo, useState } from 'react';
import ProgressBar from '../../components/shared/ProgressBar';
import { Lock, CheckCircle2, Loader2, DollarSign, Target, Wand2 } from 'lucide-react';
import { fetchMatches, fetchProfile, fetchRoadmap, generateRoadmap } from '../../services/api';

const LOCAL_USER_ID_KEY = 'scholarmatch_user_id';

const statusConfig = {
  complete: { icon: CheckCircle2, label: 'Complete', color: 'text-brand-success', badge: 'bg-brand-success/10 text-brand-success' },
  'in-progress': { icon: Loader2, label: 'In Progress', color: 'text-brand-accent', badge: 'bg-brand-accent/10 text-brand-accent' },
  locked: { icon: Lock, label: 'Locked', color: 'text-brand-muted', badge: 'bg-brand-surface text-brand-muted' },
};

function normalizeMatch(match) {
  const scholarship = match?.scholarship || {};
  const score = Number(match?.match_score);
  const amount = Number(scholarship.amount);

  return {
    matchScore: Number.isFinite(score) ? score : null,
    amount: Number.isFinite(amount) ? amount : null,
  };
}

function toMoney(value) {
  if (!Number.isFinite(value) || value < 0) return '!';
  return `$${Math.round(value).toLocaleString()}`;
}

function createRoadmapSteps(profile, matches) {
  const gpa = Number(profile?.gpa);
  const hasGpa = Number.isFinite(gpa);
  const hasResume = Boolean(profile?.resume_url);
  const hasTranscript = Boolean(profile?.transcript_url);
  const hasExtracurriculars = typeof profile?.extracurriculars === 'string' && profile.extracurriculars.trim().length > 0;
  const highFit = matches.filter((m) => Number.isFinite(m.matchScore) && m.matchScore >= 80);
  const moderateFit = matches.filter((m) => Number.isFinite(m.matchScore) && m.matchScore >= 60);
  const potentialValue = matches.reduce((sum, m) => sum + (Number.isFinite(m.amount) ? m.amount : 0), 0);

  const gpaProgress = !hasGpa ? 0 : Math.max(0, Math.min(100, Math.round((gpa / 3.5) * 100)));
  const gpaStatus = hasGpa && gpa >= 3.5 ? 'complete' : (hasGpa ? 'in-progress' : 'locked');

  return [
    {
      id: 1,
      title: 'Reach a 3.5 GPA benchmark',
      description: hasGpa
        ? `Current GPA: ${gpa.toFixed(2)}. Raising this increases eligibility for merit-heavy scholarships.`
        : 'GPA was not returned by backend profile yet.',
      status: gpaStatus,
      progress: gpaStatus === 'in-progress' ? gpaProgress : (gpaStatus === 'complete' ? 100 : 0),
      unlockValue: Number.isFinite(potentialValue) ? Math.round(potentialValue * 0.2) : null,
      unlockCount: highFit.length,
    },
    {
      id: 2,
      title: 'Add extracurricular or leadership evidence',
      description: hasExtracurriculars
        ? 'Extracurricular information exists in your backend profile.'
        : 'No extracurriculars found in backend profile. Add clubs, volunteering, or leadership roles.',
      status: hasExtracurriculars ? 'complete' : 'in-progress',
      progress: hasExtracurriculars ? 100 : 25,
      unlockValue: Number.isFinite(potentialValue) ? Math.round(potentialValue * 0.15) : null,
      unlockCount: moderateFit.length,
    },
    {
      id: 3,
      title: 'Upload your resume',
      description: hasResume
        ? 'Resume URL detected in backend profile.'
        : 'Resume URL missing from backend profile. Uploading unlocks document-required opportunities.',
      status: hasResume ? 'complete' : 'in-progress',
      progress: hasResume ? 100 : 10,
      unlockValue: Number.isFinite(potentialValue) ? Math.round(potentialValue * 0.1) : null,
      unlockCount: moderateFit.length,
    },
    {
      id: 4,
      title: 'Upload your transcript',
      description: hasTranscript
        ? 'Transcript URL detected in backend profile.'
        : 'Transcript URL missing from backend profile. Many formal applications require it.',
      status: hasTranscript ? 'complete' : 'locked',
      progress: hasTranscript ? 100 : 0,
      unlockValue: Number.isFinite(potentialValue) ? Math.round(potentialValue * 0.1) : null,
      unlockCount: highFit.length,
    },
    {
      id: 5,
      title: 'Prioritize high-fit scholarships',
      description: Number.isFinite(highFit.length)
        ? `Backend currently returns ${highFit.length} scholarships with 80+ match score.`
        : 'High-fit scholarship count unavailable from backend.',
      status: highFit.length >= 3 ? 'complete' : (highFit.length > 0 ? 'in-progress' : 'locked'),
      progress: highFit.length >= 3 ? 100 : Math.min(90, highFit.length * 30),
      unlockValue: Number.isFinite(potentialValue) ? Math.round(potentialValue * 0.45) : null,
      unlockCount: highFit.length,
    },
  ];
}

export default function RoadmapPage() {
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [roadmapSteps, setRoadmapSteps] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadRoadmapData = async () => {
    const userId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
    if (!userId) return;

    setLoading(true);
    try {
      const [profileResponse, matchesResponse, roadmapResponse] = await Promise.all([
        fetchProfile(userId),
        fetchMatches(userId, false),
        fetchRoadmap(userId).catch(() => ({ steps: [] })),
      ]);

      setProfile(profileResponse || null);
      const rawMatches = Array.isArray(matchesResponse?.matches) ? matchesResponse.matches : [];
      setMatches(rawMatches.map(normalizeMatch));
      setRoadmapSteps(Array.isArray(roadmapResponse?.steps) ? roadmapResponse.steps : null);
    } catch {
      setProfile(null);
      setMatches([]);
      setRoadmapSteps(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoadmapData();
  }, []);

  const handleGenerate = async () => {
    const userId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
    if (!userId || generating) return;
    setGenerating(true);
    try {
      const res = await generateRoadmap(userId);
      setRoadmapSteps(Array.isArray(res?.steps) ? res.steps : []);
    } catch {
      setRoadmapSteps(null);
    } finally {
      setGenerating(false);
    }
  };

  const qualifiedScholarships = useMemo(
    () => matches.filter((s) => Number.isFinite(s.matchScore) && s.matchScore >= 80),
    [matches],
  );

  const qualifiedValue = useMemo(
    () => matches.reduce((sum, s) => sum + (Number.isFinite(s.amount) ? s.amount : 0), 0),
    [matches],
  );

  const computedSteps = useMemo(() => createRoadmapSteps(profile, matches), [profile, matches]);
  const stepsToShow = roadmapSteps && roadmapSteps.length > 0 ? roadmapSteps : computedSteps;
  const totalUnlockable = useMemo(
    () => stepsToShow.reduce((sum, s) => sum + (Number.isFinite(s.unlockValue) ? s.unlockValue : 0), 0),
    [stepsToShow],
  );
  const unlockCountTotal = useMemo(
    () => stepsToShow.reduce((sum, s) => sum + (Number.isFinite(s.unlockCount) ? s.unlockCount : 0), 0),
    [stepsToShow],
  );

  const qualifiedCountLabel = loading ? 'Loading...' : qualifiedScholarships.length;
  const qualifiedValueLabel = loading ? 'Loading...' : toMoney(qualifiedValue);
  const unlockCountLabel = loading ? 'Loading...' : unlockCountTotal;
  const totalUnlockableLabel = loading ? 'Loading...' : toMoney(totalUnlockable);

  return (
    <div className="animate-fade-in max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-brand-text">Scholarship Roadmap</h1>
        <p className="text-brand-muted mt-1">Unlock your full scholarship potential with these steps.</p>
      </div>

      {/* Gap Analysis Summary + Generate */}
      <div className="glass-card p-6 border-brand-accent/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-brand-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Target className="text-brand-accent" size={24} />
            </div>
            <div>
              <h3 className="font-display font-bold text-brand-text text-lg">
                You qualify for {qualifiedCountLabel} scholarships worth {qualifiedValueLabel}
              </h3>
              <p className="text-brand-muted text-sm mt-1">
                Complete the steps below to unlock <span className="text-brand-accent font-semibold">{unlockCountLabel} more scholarships</span> worth up to <span className="text-brand-accent font-semibold">{totalUnlockableLabel}</span>.
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || loading}
            className="btn-primary flex-shrink-0"
          >
            {generating ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
            {generating ? ' Generating...' : ' Generate AI Roadmap'}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-brand-border" />

        <div className="space-y-6">
          {stepsToShow.map((step, idx) => {
            const config = statusConfig[step.status];
            const Icon = config.icon;
            const unlockValueLabel = Number.isFinite(step.unlockValue) ? `$${step.unlockValue.toLocaleString()}` : '!';
            const unlockCountLabelLocal = Number.isFinite(step.unlockCount) ? step.unlockCount : '!';
            return (
              <div key={step.id} className="relative">
                {/* Dot on timeline */}
                <div className={'absolute -left-5 w-6 h-6 rounded-full flex items-center justify-center border-2 ' +
                  (step.status === 'complete' ? 'bg-brand-success border-brand-success' :
                    step.status === 'in-progress' ? 'bg-brand-accent/20 border-brand-accent' : 'bg-brand-surface border-brand-border')}>
                  <Icon size={12} className={config.color} />
                </div>

                <div className={'glass-card p-5 ml-4 ' + (step.status === 'locked' ? 'opacity-60' : '')}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={'text-xs px-2 py-0.5 rounded-full font-semibold ' + config.badge}>{config.label}</span>
                        <span className="text-xs text-brand-muted">Step {idx + 1}</span>
                      </div>
                      <h3 className="font-display font-bold text-brand-text text-base">{step.title}</h3>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="flex items-center gap-1 text-brand-accent">
                        <DollarSign size={14} />
                        <span className="font-display font-bold text-sm">{unlockValueLabel}</span>
                      </div>
                      <span className="text-[10px] text-brand-muted">{unlockCountLabelLocal} scholarships</span>
                    </div>
                  </div>
                  <p className="text-sm text-brand-muted mb-3">{step.description}</p>
                  {step.status === 'in-progress' && (
                    <ProgressBar value={step.progress} color="brand-accent" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
