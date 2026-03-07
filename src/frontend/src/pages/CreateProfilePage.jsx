import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useApp } from '../context/AppContext';
import ResumeUploader from '../components/profile/ResumeUploader';
import ManualProfileForm from '../components/profile/ManualProfileForm';
import { FileText, PenLine, ArrowRight, Zap, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function CreateProfilePage() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const { user } = useAuth0();
  const [tab, setTab] = useState('resume');
  const [connectionStatus, setConnectionStatus] = useState(null); // null, loading, success, error
  const [connectionMessage, setConnectionMessage] = useState('');

  const saveAndNavigate = (formData) => {
    dispatch({ type: 'SET_PROFILE', payload: formData });
    // Save to localStorage keyed by Auth0 user ID so it persists across sessions
    if (user?.sub) {
      localStorage.setItem(`profile_${user.sub}`, JSON.stringify(formData));
    }
    navigate('/first-time');
  };

  const handleManualSubmit = (formData) => {
    saveAndNavigate(formData);
  };

  const handleDemoProfile = () => {
    dispatch({ type: 'SET_DEMO_PROFILE' });
    navigate('/first-time');
  };

  const handleResumeComplete = () => {
    dispatch({ type: 'SET_DEMO_PROFILE' });
    navigate('/first-time');
  };

  const testConnection = async () => {
    setConnectionStatus('loading');
    setConnectionMessage('Testing connection...');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus('success');
        setConnectionMessage(`✓ Connected! Backend responded: ${JSON.stringify(data)}`);
      } else {
        setConnectionStatus('error');
        setConnectionMessage(`✗ Backend returned status ${response.status}`);
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(`✗ Connection failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display font-bold text-brand-text mb-3">Build Your Profile</h1>
          <p className="text-brand-muted text-lg">Choose how our AI engine should learn about you.</p>
        </div>

        <div className="glass-card p-1">
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

        <div className="text-center mt-6">
          <button onClick={handleDemoProfile}
            className="text-sm text-brand-muted hover:text-brand-accent transition-colors inline-flex items-center gap-1.5">
            <Zap size={14} /> Use demo profile (Alex Student) for quick exploration
          </button>

          {/* Connection Test Section */}
          <div className="mt-6 pt-6 border-t border-brand-border">
            <button
              onClick={testConnection}
              disabled={connectionStatus === 'loading'}
              className="text-sm text-brand-muted hover:text-brand-accent transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {connectionStatus === 'loading' ? (
                <>
                  <Loader size={14} className="animate-spin" /> Testing backend connection...
                </>
              ) : (
                <>
                  <Zap size={14} /> Test API Connection
                </>
              )}
            </button>

            {connectionStatus === 'success' && (
              <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-400">{connectionMessage}</p>
              </div>
            )}

            {connectionStatus === 'error' && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{connectionMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}