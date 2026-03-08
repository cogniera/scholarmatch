import { Check, X as XIcon, ExternalLink, Share2, Plus } from 'lucide-react';
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
    requirementsMet: [],
    requirementsMissing: [],
    improvementTip: '',
  };
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
        <img src={scholarship.bannerUrl || 'https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_450,g_auto,f_auto/cld-sample-4'} alt={scholarship.name || '!'} className="w-full h-48 md:h-56 object-cover rounded-xl mb-6 shadow-sm border border-brand-border/50" />
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

      {/* AI Analysis */}
      <div className="bg-brand-bg rounded-xl p-5 border border-brand-border mb-6">
        <h4 className="text-base font-display font-semibold text-brand-text mb-4 flex items-center gap-2">
          🤖 AI Eligibility Analysis
        </h4>

        {/* Requirements Met */}
        {Array.isArray(aiAnalysis.requirementsMet) && aiAnalysis.requirementsMet.length > 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-medium text-brand-success flex items-center gap-1.5 mb-2"><Check size={16} /> Requirements Met</h5>
            <ul className="space-y-1">
              {aiAnalysis.requirementsMet.map((r, i) => (
                <li key={i} className="text-sm text-brand-text flex items-start gap-2"><span className="text-brand-success/50 mt-0.5">•</span>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing */}
        {Array.isArray(aiAnalysis.requirementsMissing) && aiAnalysis.requirementsMissing.length > 0 && (
          <div className="mb-4 pt-3 border-t border-brand-border">
            <h5 className="text-sm font-medium text-brand-warning flex items-center gap-1.5 mb-2"><XIcon size={16} /> Missing / Action Required</h5>
            <ul className="space-y-1">
              {aiAnalysis.requirementsMissing.map((r, i) => (
                <li key={i} className="text-sm text-brand-text flex items-start gap-2"><span className="text-brand-warning/50 mt-0.5">•</span>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tip */}
        {aiAnalysis.improvementTip && (
          <div className="pt-3 border-t border-brand-border">
            <p className="text-sm text-brand-accent">💡 {aiAnalysis.improvementTip}</p>
          </div>
        )}
      </div>

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
