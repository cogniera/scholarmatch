import { useEffect, useState } from 'react';
import { User, MapPin, BookOpen, GraduationCap, Briefcase, Mail, CircleDollarSign, Sparkles } from 'lucide-react';

export default function ManualProfileForm({
  onSubmit,
  submitting = false,
  submitError = '',
  submitSuccess = '',
  submitChecks = [],
  initialEmail = '',
}) {
  const [form, setForm] = useState({
    name: '',
    email: initialEmail,
    program: '',
    gpa: 3.0,
    academic_level: 'Undergraduate',
    location: '',
    financial_need: false,
    extracurriculars: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (initialEmail && !form.email) {
      setForm(prev => ({ ...prev, email: initialEmail }));
    }
  }, [initialEmail, form.email]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-brand-muted mb-2">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-3 text-brand-muted" size={16} />
            <input type="text" className="input-field pl-10" placeholder="Alex Student" value={form.name} onChange={e => update('name', e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-muted mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-brand-muted" size={16} />
            <input type="email" className="input-field pl-10" placeholder="you@example.com" value={form.email} onChange={e => update('email', e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-muted mb-2">Program of Study</label>
          <div className="relative">
            <BookOpen className="absolute left-3 top-3 text-brand-muted" size={16} />
            <input type="text" className="input-field pl-10" placeholder="Computer Science" value={form.program} onChange={e => update('program', e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-muted mb-2">Academic Level</label>
          <div className="relative">
            <GraduationCap className="absolute left-3 top-3 text-brand-muted" size={16} />
            <select className="input-field pl-10 appearance-none" value={form.academic_level} onChange={e => update('academic_level', e.target.value)}>
              {['High School', 'Undergraduate', 'Graduate', 'PhD'].map(level => <option key={level} value={level}>{level}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-muted mb-2">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 text-brand-muted" size={16} />
            <input type="text" className="input-field pl-10" placeholder="Ontario, Canada" value={form.location} onChange={e => update('location', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-muted mb-2">
            Current GPA: <span className="text-brand-accent font-bold">{form.gpa.toFixed(1)}</span>
          </label>
          <input
            type="range" min="0" max="4" step="0.1"
            value={form.gpa} onChange={e => update('gpa', parseFloat(e.target.value))}
            className="w-full h-2 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-accent"
          />
          <div className="flex justify-between text-xs text-brand-muted mt-1"><span>0.0</span><span>4.0</span></div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-brand-muted">Financial Need</label>
        <label className="inline-flex items-center gap-2 text-sm text-brand-text">
          <input
            type="checkbox"
            checked={form.financial_need}
            onChange={(e) => update('financial_need', e.target.checked)}
            className="accent-brand-accent"
          />
          <CircleDollarSign size={16} className="text-brand-muted" />
          I want need-based scholarships included in my recommendations
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-muted mb-2">Extracurriculars</label>
        <div className="relative">
          <Sparkles className="absolute left-3 top-3 text-brand-muted" size={16} />
          <textarea
            className="input-field pl-10 min-h-24"
            placeholder="Clubs, volunteering, projects, leadership, competitions..."
            value={form.extracurriculars}
            onChange={e => update('extracurriculars', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button type="submit" className="btn-primary" disabled={submitting}>
          <Briefcase size={18} /> {submitting ? 'Saving Profile...' : 'Launch My Profile'}
        </button>
      </div>

      {submitError ? (
        <p className="text-red-400 text-sm text-center">{submitError}</p>
      ) : null}

      {submitSuccess ? (
        <p className="text-brand-success text-sm text-center">{submitSuccess}</p>
      ) : null}

      {submitChecks.length ? (
        <div className="rounded-lg border border-brand-border bg-brand-bg/40 p-4 space-y-3">
          <p className="text-sm font-semibold text-brand-text">Submission Diagnostics</p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {submitChecks.map((check, index) => {
              const isError = check.status === 'error';
              return (
                <div
                  key={`${check.layer}-${check.step}-${index}`}
                  className={`text-xs rounded-md p-2 border ${isError ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-brand-border bg-brand-bg/50 text-brand-muted'}`}
                >
                  <p className="font-medium text-brand-text">
                    [{check.layer}] {check.step} - {check.status}
                  </p>
                  <p>{check.message}</p>
                  {check.meta ? (
                    <pre className="mt-1 whitespace-pre-wrap break-all text-[11px] opacity-80">
                      {JSON.stringify(check.meta)}
                    </pre>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </form>
  );
}
