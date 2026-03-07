import { useState } from 'react';
import { cloudinaryConfig } from '../../cloudinary/cloudinaryConfig';
import { getResumePreviewUrl } from '../../cloudinary/transformations';
import { useApp } from '../../context/AppContext';
import { saveUploadUrls } from '../../services/api';
import { UploadCloud, FileText, Check, Loader } from 'lucide-react';

export default function ResumeUploader() {
  const { state, dispatch } = useApp();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleUpload = () => {
    if (!window.cloudinary) {
      alert('Cloudinary widget not loaded. Check your internet connection.');
      return;
    }
    window.cloudinary.openUploadWidget(
      {
        cloudName: cloudinaryConfig.cloudName,
        uploadPreset: cloudinaryConfig.uploadPreset,
        sources: ['local', 'url', 'camera'],
        resourceType: 'auto',
        maxFileSize: 10000000,
        clientAllowedFormats: ['pdf', 'doc', 'docx'],
        showAdvancedOptions: false,
        cropping: false,
        multiple: false,
        styles: {
          palette: { window: '#0F1624', sourceBg: '#080C14', windowBorder: '#1E2D4A', tabIcon: '#F5A623', inactiveTabIcon: '#6B7E9F', menuIcons: '#F5A623', link: '#F5A623', action: '#F5A623', inProgress: '#F5A623', complete: '#22C55E', error: '#EF4444', textDark: '#E8EDF5', textLight: '#6B7E9F' },
        },
      },
      async (error, result) => {
        if (!error && result && result.event === 'success') {
          const { secure_url, public_id } = result.info;

          // 1. Update local React state immediately so UI feels instant
          dispatch({
            type: 'SET_RESUME_URL',
            payload: { url: secure_url, publicId: public_id },
          });

          // 2. Save URL to backend (Supabase) so it persists after page refresh
          setSaving(true);
          setSaveError(null);
          try {
            const token = state.authToken;
            if (token) {
              await saveUploadUrls(token, { resume_url: secure_url });
            }
          } catch (err) {
            console.error('Failed to save resume URL to backend:', err);
            setSaveError('Uploaded, but failed to save to your profile. Please try again.');
          } finally {
            setSaving(false);
          }
        }
      }
    );
  };

  if (state.resumeUrl) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-xs mx-auto rounded-xl overflow-hidden border border-brand-border shadow-lg">
          <img
            src={getResumePreviewUrl(state.resumePublicId)}
            alt="Resume preview"
            className="w-full h-auto"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        {saving ? (
          <div className="flex items-center gap-2 text-brand-muted text-sm">
            <Loader size={16} className="animate-spin" /> Saving to your profile...
          </div>
        ) : saveError ? (
          <p className="text-red-400 text-sm text-center">{saveError}</p>
        ) : (
          <div className="flex items-center gap-2 text-brand-success font-medium">
            <Check size={18} /> Resume uploaded and saved
          </div>
        )}

        <button onClick={handleUpload} className="btn-ghost text-sm">
          Replace Resume
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mb-6">
        <FileText className="text-brand-accent" size={28} />
      </div>
      <h3 className="text-xl font-display font-bold text-white mb-2">Upload Your Resume</h3>
      <p className="text-brand-muted mb-8 max-w-md text-sm">
        Upload a PDF or DOCX. Our AI will extract your achievements and match you to scholarships instantly.
      </p>
      <button
        onClick={handleUpload}
        className="w-full border-2 border-dashed border-brand-border hover:border-brand-accent hover:bg-brand-accent/5 transition-all rounded-xl p-10 flex flex-col items-center gap-4 cursor-pointer group"
      >
        <UploadCloud size={48} className="text-brand-muted group-hover:text-brand-accent transition-colors" />
        <div className="text-sm text-brand-muted">
          <span className="text-brand-accent font-medium">Click to browse</span> or drag & drop
        </div>
        <span className="text-xs text-brand-muted/60">PDF, DOC, DOCX • Max 10MB</span>
      </button>
      <p className="text-xs text-brand-muted/50 mt-4">Securely processed via Cloudinary</p>
    </div>
  );
}
