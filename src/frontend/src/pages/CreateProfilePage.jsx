import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ResumeUploader from '../components/profile/ResumeUploader';
import ManualProfileForm from '../components/profile/ManualProfileForm';
import { FileText, PenLine, ArrowRight, Zap } from 'lucide-react';

export default function CreateProfilePage() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const [tab, setTab] = useState('resume');

  const handleManualSubmit = (formData) => {
    dispatch({ type: 'SET_PROFILE', payload: formData });
    navigate('/dashboard/home');
  };

  const handleDemoProfile = () => {
    dispatch({ type: 'SET_DEMO_PROFILE' });
    navigate('/dashboard/home');
  };

  const handleResumeComplete = () => {
    dispatch({ type: 'SET_DEMO_PROFILE' });
    navigate('/dashboard/home');
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display font-bold text-brand-text mb-3">Build Your Profile</h1>
          <p className="text-brand-muted text-lg">Choose how our AI engine should learn about you.</p>
        </div>

        {/* Card */}
        <div className="glass-card p-1">
          {/* Tab Switcher */}
          <div className="flex p-1 bg-brand-bg/50 rounded-lg mb-6">
            <button
              onClick={() => setTab('resume')}
              className={'flex-1 py-3 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ' +
                (tab === 'resume' ? 'bg-brand-accent text-brand-bg shadow-lg' : 'text-brand-muted hover:text-brand-text')}
            >
              <FileText size={16} /> AI Resume Parse
            </button>
            <button
              onClick={() => setTab('manual')}
              className={'flex-1 py-3 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ' +
                (tab === 'manual' ? 'bg-brand-accent text-brand-bg shadow-lg' : 'text-brand-muted hover:text-brand-text')}
            >
              <PenLine size={16} /> Manual Entry
            </button>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8">
            {tab === 'resume' ? (
              <div className="animate-fade-in">
                <ResumeUploader />
                <div className="mt-8 flex flex-col items-center gap-4">
                  <button onClick={handleResumeComplete} className="btn-primary">
                    Continue to Dashboard <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in">
                <ManualProfileForm onSubmit={handleManualSubmit} />
              </div>
            )}
          </div>
        </div>

        {/* Quick demo entry */}
        <div className="text-center mt-6">
          <button onClick={handleDemoProfile}
            className="text-sm text-brand-muted hover:text-brand-accent transition-colors inline-flex items-center gap-1.5">
            <Zap size={14} /> Use demo profile (Alex Student) for quick exploration
          </button>
        </div>
      </div>
    </div>
  );
}
