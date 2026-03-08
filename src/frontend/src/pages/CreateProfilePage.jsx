import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import ManualProfileForm from '../components/profile/ManualProfileForm';
import { useApp } from '../context/AppContext';
import { createOrUpdateProfile } from '../services/api';

const LOCAL_USER_ID_KEY = 'scholarmatch_user_id';

function hasSuccessfulDbInsert(checks) {
  return Array.isArray(checks) && checks.some(
    (check) => check?.layer === 'backend' && check?.step === 'db_insert' && check?.status === 'ok'
  );
}

export default function CreateProfilePage() {
  const navigate = useNavigate();
  const { dispatch } = useApp();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitChecks, setSubmitChecks] = useState([]);

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitChecks([]);

    try {
      const existingUserId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
      const { profile, checks, mode } = await createOrUpdateProfile(formData, existingUserId);

      if (mode === 'create' && !hasSuccessfulDbInsert(checks)) {
        throw new Error('Database did not confirm your profile save. Please try again.');
      }

      dispatch({ type: 'SET_PROFILE_FROM_BACKEND', payload: profile });
      window.localStorage.setItem(LOCAL_USER_ID_KEY, profile.id);

      setSubmitChecks(checks || []);
      setSubmitSuccess('Profile saved. Taking you to your recommendations...');
      setTimeout(() => navigate('/first-time-recommendations'), 400);
    } catch (error) {
      setSubmitError(error.message || 'Failed to save profile. Please try again.');
      setSubmitChecks(Array.isArray(error.checks) ? error.checks : []);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-28 pb-16">
        <section className="glass-card p-8 md:p-10 border border-brand-border/40">
          <h1 className="text-3xl font-display font-bold">Create Your Scholarship Profile</h1>
          <p className="text-brand-muted mt-2 mb-8">
            Enter your academic details and we will save them directly to your ScholarMatch profile.
          </p>

          <ManualProfileForm
            onSubmit={handleSubmit}
            submitting={submitting}
            submitError={submitError}
            submitSuccess={submitSuccess}
            submitChecks={submitChecks}
          />
        </section>
      </main>
    </div>
  );
}
