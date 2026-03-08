import { Check, X as XIcon, ExternalLink, Share2, Plus, ListChecks } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getHighlightCardUrl } from '../../cloudinary/transformations';
import Badge from '../shared/Badge';
import { AdvancedVideo } from '@cloudinary/react';
import { Cloudinary } from '@cloudinary/url-gen';

export default function ScholarshipModal({ scholarship, onClose }) {
  const { state, dispatch } = useApp();
  if (!scholarship) return null;

  const cld = new Cloudinary({ cloud: { cloudName: 'demo' } });

  const aiAnalysis = scholarship.aiAnalysis || {
    whyYouQualify: [],
    aiExplanation: '',
    eligibilityReason: '',
  };
  const nextSteps = Array.isArray(scholarship.nextSteps) ? scholarship.nextSteps : [];
  const scoreComponents = scholarship.scoreComponents;
  const overallRec = scholarship.overallRecommendation;
  const requiredDocuments = Array.isArray(scholarship.requiredDocuments) ? scholarship.requiredDocuments : [];
  const amountLabel = Number.isFinite(Number(scholarship.amount)) ? `$${Number(scholarship.amount).toLocaleString()}` : '!';
  const deadlineLabel = scholarship.deadline ? new Date(scholarship.deadline).toLocaleDateString() : '!';
  const studentName = state.profile?.name || 'Student';
  const highlightUrl = getHighlightCardUrl(studentName, scholarship.name || '!', scholarship.amount || 0, scholarship.matchScore || 0);

  const handleAddApplication = () => {
    dispatch({ type: 'ADD_APPLICATION', payload: { id: scholarship.id, scholarshipId: scholarship.id, name: scholarship.name, amount: scholarship.amount, deadline: scholarship.deadline, status: 'saved', progress: 0 } });
  };

  const handleShare = () => {
    const shareAmount = Number.isFinite(Number(scholarship.amount)) ? Number(scholarship.amount).toLocaleString() : '!';
    const text = `I'm a ${scholarship.matchScore || '!'}% match for the ${scholarship.name || '!'} ($${shareAmount})! Found via @ScholarAI #CloudinaryHackathon`;
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(highlightUrl), '_blank');
  };

  return (
    <>
      {/* Banner or Video Player (Side Quest 2) */}
      {scholarship.videoUrl ? (
        <div className="w-full h-64 md:h-80 rounded-xl overflow-hidden mb-6 shadow-lg border border-brand-border bg-black flex items-center">
          <AdvancedVideo
            cldVid={cld.video(scholarship.videoUrl)}
            controls
            autoPlay
            loop
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <img src={scholarship.bannerUrl || scholarship.image_url} alt={scholarship.name} className="w-full h-48 md:h-56 object-cover rounded-xl mb-6 shadow-sm border border-brand-border/50" />
      )}

      {/* Title + Amount */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-display font-bold text-brand-text">{scholarship.name || '!'}</h3>
          <p className="text-brand-muted">{scholarship.organization || '!'}</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-display font-black text-brand-accent">{amountLabel}</span>
          <p className="text-xs text-brand-muted">Deadline: {deadlineLabel}</p>
        </div>
      </div>

      {/* Priority Badge */}
      {overallRec && (
        <div className="mb-4">
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
            overallRec === 'high priority' ? 'bg-green-100 text-green-800' :
            overallRec === 'medium' ? 'bg-amber-100 text-amber-800' :
            'bg-slate-100 text-slate-700'
          }`}>
            {overallRec}
          </span>
        </div>
      )}

      {/* AI Analysis & Why You Qualify */}
      <div className="bg-brand-bg rounded-xl p-5 border border-brand-border mb-6">
        <h4 className="text-base font-display font-semibold text-brand-text mb-4 flex items-center gap-2">
          🤖 AI Eligibility Analysis
        </h4>

        {aiAnalysis.aiExplanation && (
          <div className="mb-4">
            <h5 className="text-sm font-medium text-brand-success flex items-center gap-1.5 mb-2"><Check size={16} /> Why You Qualify</h5>
            <p className="text-sm text-brand-text leading-relaxed">{aiAnalysis.aiExplanation}</p>
          </div>
        )}

        {Array.isArray(aiAnalysis.whyYouQualify) && aiAnalysis.whyYouQualify.length > 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-medium text-brand-text flex items-center gap-1.5 mb-2">Match Factors</h5>
            <ul className="space-y-1">
              {aiAnalysis.whyYouQualify.map((r, i) => (
                <li key={i} className="text-sm text-brand-text flex items-start gap-2"><span className="text-brand-success/50 mt-0.5">•</span>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {aiAnalysis.eligibilityReason && aiAnalysis.eligibilityReason !== 'Eligible' && (
          <p className="text-xs text-brand-muted mt-2">{aiAnalysis.eligibilityReason}</p>
        )}

        {scoreComponents && typeof scoreComponents === 'object' && (
          <div className="mt-4 pt-3 border-t border-brand-border">
            <h5 className="text-xs font-medium text-brand-muted mb-2">Score Breakdown</h5>
            <div className="flex flex-wrap gap-2">
              {Object.entries(scoreComponents).map(([k, v]) => (
                <span key={k} className="text-xs px-2 py-1 rounded bg-white border border-brand-border">
                  {k}: {typeof v === 'number' ? Math.round(v * 100) + '%' : String(v)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Next Steps Checklist */}
      {nextSteps.length > 0 && (
        <div className="bg-brand-bg rounded-xl p-5 border border-brand-border mb-6">
          <h4 className="text-base font-display font-semibold text-brand-text mb-4 flex items-center gap-2">
            <ListChecks size={18} /> Application Steps
          </h4>
          <ol className="space-y-3">
            {nextSteps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-brand-text">{typeof step === 'object' && step?.task ? step.task : step}</p>
                  {typeof step === 'object' && step?.tag && (
                    <span className="text-xs text-brand-muted">{step.tag}</span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Required Documents */}
      <div className="mb-6">
        <h4 className="text-base font-display font-semibold text-brand-text mb-3">Required Documents</h4>
        <div className="flex flex-wrap gap-2">
          {requiredDocuments.length > 0
            ? requiredDocuments.map(doc => <Badge key={doc} variant="muted">{doc}</Badge>)
            : <Badge variant="muted">!</Badge>}
        </div>
      </div>

      {/* Shareable Highlight Card */}
      <div className="glass-card p-4 mb-6">
        <h4 className="text-sm font-display font-semibold text-brand-text mb-3">📸 Share This Match (Cloudinary Transformation)</h4>
        <img src={highlightUrl} alt="Shareable highlight card" className="w-full rounded-lg mb-3" onError={e => { e.target.style.display = 'none'; }} />
        <button onClick={handleShare} className="btn-ghost text-sm w-full justify-center">
          <Share2 size={16} /> Share to Twitter @Cloudinary
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <a href={scholarship.applicationUrl || '#'} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 justify-center">
          Apply Now <ExternalLink size={16} />
        </a>
        <button onClick={handleAddApplication} className="btn-ghost flex-1 justify-center">
          <Plus size={16} /> Add to Applications
        </button>
      </div>
    </>
  );
}
