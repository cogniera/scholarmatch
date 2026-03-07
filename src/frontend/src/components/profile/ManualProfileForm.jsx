import { useState } from 'react';
import { User, MapPin, BookOpen, GraduationCap, Calendar, Briefcase } from 'lucide-react';

export default function ManualProfileForm({ onSubmit }) {
  const [form, setForm] = useState({
    name: '', program: '', gpa: 3.0, university: '', year: '3rd Year', location: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

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
          <label className="block text-sm font-medium text-brand-muted mb-2">University</label>
          <div className="relative">
            <GraduationCap className="absolute left-3 top-3 text-brand-muted" size={16} />
            <input type="text" className="input-field pl-10" placeholder="University of Waterloo" value={form.university} onChange={e => update('university', e.target.value)} required />
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
          <label className="block text-sm font-medium text-brand-muted mb-2">Year</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 text-brand-muted" size={16} />
            <select className="input-field pl-10 appearance-none" value={form.year} onChange={e => update('year', e.target.value)}>
              {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate'].map(y => <option key={y} value={y}>{y}</option>)}
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
      <div className="flex justify-end pt-4">
        <button type="submit" className="btn-primary">
          <Briefcase size={18} /> Launch My Profile
        </button>
      </div>
    </form>
  );
}
