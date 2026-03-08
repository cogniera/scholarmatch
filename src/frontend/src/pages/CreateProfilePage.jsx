import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useApp } from '../context/AppContext';
import ResumeUploader from '../components/profile/ResumeUploader';
import ManualProfileForm from '../components/profile/ManualProfileForm';
import { createProfile } from '../services/api';
import { FileText, PenLine, ArrowRight, Zap } from 'lucide-react';

export default function CreateProfilePage() {
  const DEBUG_TRACE_STORAGE_KEY = 'create_profile_debug_trace';
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const { user, getAccessTokenSilently, getAccessTokenWithPopup, loginWithRedirect } = useAuth0();
  const [tab, setTab] = useState('resume');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualSubmitError, setManualSubmitError] = useState('');
  const [manualSubmitSuccess, setManualSubmitSuccess] = useState('');
  const [manualSubmitChecks, setManualSubmitChecks] = useState([]);
  const prefilledEmail = useMemo(() => user?.email || '', [user?.email]);

  const makeCheck = (layer, step, status, message, meta = null) => ({
    ts: new Date().toISOString(),
    layer,
    step,
    status,
    message,
    ...(meta ? { meta } : {}),
  });

  const saveTraceForRedirect = (trace, message) => {
    try {
      sessionStorage.setItem(
        DEBUG_TRACE_STORAGE_KEY,
        JSON.stringify({
          checks: trace,
          error: message,
        })
      );
    } catch {
      // Ignore storage errors in private mode or restricted environments.
    }
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DEBUG_TRACE_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.checks)) {
        setTab('manual');
        setManualSubmitChecks(parsed.checks);
      }
      if (typeof parsed?.error === 'string' && parsed.error.trim()) {
        setManualSubmitError(parsed.error);
      }

      sessionStorage.removeItem(DEBUG_TRACE_STORAGE_KEY);
    } catch {
      // Ignore malformed payload and continue.
    }
  }, []);

  const handleManualSubmit = async (formData) => {
    const trace = [
      makeCheck('frontend', 'form_submit', 'ok', 'Manual form submitted'),
      makeCheck('frontend', 'form_payload_built', 'ok', 'Collected form payload', { fields: Object.keys(formData) }),
    ];

    setIsSubmittingManual(true);
    setManualSubmitError('');
    setManualSubmitSuccess('');
    setManualSubmitChecks(trace);

    try {
      trace.push(makeCheck('frontend', 'auth_token_request', 'ok', 'Requesting Auth0 access token'));
      setManualSubmitChecks([...trace]);

      let token;
      try {
        token = await getAccessTokenSilently({
          authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
        });
      } catch (tokenError) {
        const auth0Code = tokenError?.error || null;
        trace.push(makeCheck(
          'frontend',
          'auth_token_request',
          'error',
          tokenError?.message || 'Failed to get Auth0 token',
          {
            code: auth0Code,
            description: tokenError?.error_description || null,
          }
        ));
        setManualSubmitChecks([...trace]);

        if (auth0Code === 'consent_required' || auth0Code === 'login_required' || auth0Code === 'missing_refresh_token') {
          const recoveryMessage =
            auth0Code === 'consent_required'
              ? 'Auth0 consent is required. Opening consent popup.'
              : auth0Code === 'login_required'
                ? 'Auth0 login is required. Sign in again to continue.'
                : 'Missing refresh token. Opening interactive login to refresh session.';

          trace.push(makeCheck(
            'frontend',
            'auth_recovery_popup',
            'ok',
            recoveryMessage
          ));
          setManualSubmitChecks([...trace]);

          try {
            token = await getAccessTokenWithPopup({
              authorizationParams: {
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
                prompt: auth0Code === 'consent_required' ? 'consent' : auth0Code === 'login_required' ? 'login' : undefined,
              },
            });
            trace.push(makeCheck('frontend', 'auth_recovery_popup', 'ok', 'Consent/login completed in popup'));
            trace.push(makeCheck('frontend', 'auth_token_request', 'ok', 'Auth0 access token acquired after popup'));
            setManualSubmitChecks([...trace]);
          } catch (popupError) {
            trace.push(makeCheck(
              'frontend',
              'auth_recovery_popup',
              'error',
              popupError?.message || 'Popup consent/login failed',
              {
                code: popupError?.error || null,
                description: popupError?.error_description || null,
              }
            ));
            trace.push(makeCheck(
              'frontend',
              'auth_recovery_redirect',
              'ok',
              'Falling back to redirect-based Auth0 recovery'
            ));
            setManualSubmitChecks([...trace]);
            saveTraceForRedirect(trace, 'Consent/login requires redirect. Complete the flow and return.');

            await loginWithRedirect({
              authorizationParams: {
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
                prompt: auth0Code === 'consent_required' ? 'consent' : auth0Code === 'login_required' ? 'login' : undefined,
              },
              appState: { returnTo: '/create-profile' },
            });
            return;
          }
        }

        throw tokenError;
      }

      trace.push(makeCheck('frontend', 'auth_token_request', 'ok', 'Auth0 access token acquired'));
      trace.push(makeCheck('frontend', 'api_request', 'ok', 'Sending POST /profile request'));
      setManualSubmitChecks([...trace]);

      let createdProfile;
      let backendChecks = [];
      try {
        const apiResult = await createProfile(token, formData);
        createdProfile = apiResult.profile;
        backendChecks = apiResult.checks || [];
      } catch (apiError) {
        trace.push(makeCheck('frontend', 'api_request', 'error', apiError?.message || 'POST /profile failed'));
        if (Array.isArray(apiError?.checks) && apiError.checks.length) {
          trace.push(...apiError.checks);
        }
        setManualSubmitChecks([...trace]);
        throw apiError;
      }

      trace.push(makeCheck('frontend', 'api_response', 'ok', 'Received successful response from backend'));
      if (backendChecks?.length) {
        trace.push(...backendChecks);
      }

      dispatch({ type: 'SET_PROFILE_FROM_BACKEND', payload: createdProfile });
      trace.push(makeCheck('frontend', 'state_update', 'ok', 'Profile stored in app state'));
      setManualSubmitChecks([...trace]);

      setManualSubmitSuccess('Profile saved successfully. Redirecting to your dashboard...');
      navigate('/dashboard/home');
    } catch (error) {
      console.error('Failed to create profile on backend:', error);
      const errorChecks = Array.isArray(error?.checks) ? error.checks : [];
      trace.push(makeCheck('frontend', 'submit_failed', 'error', error.message || 'Profile save failed', {
        code: error?.error || null,
        description: error?.error_description || null,
      }));
      if (errorChecks.length) {
        trace.push(...errorChecks);
      }
      setManualSubmitChecks([...trace]);
      setManualSubmitError(error.message || 'Failed to save your profile. Please try again.');
    } finally {
      setIsSubmittingManual(false);
    }
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
                <ManualProfileForm
                  onSubmit={handleManualSubmit}
                  submitting={isSubmittingManual}
                  submitError={manualSubmitError}
                  submitSuccess={manualSubmitSuccess}
                  submitChecks={manualSubmitChecks}
                  initialEmail={prefilledEmail}
                />
              </div>
            )}
          </div>
        </div>

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