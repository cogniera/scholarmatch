const variants = {
  success: 'bg-brand-success/10 text-brand-success',
  warning: 'bg-brand-warning/10 text-brand-warning',
  danger: 'bg-brand-danger/10 text-brand-danger',
  accent: 'bg-brand-accent/10 text-brand-accent',
  muted: 'bg-brand-surface text-brand-muted',
};

export default function Badge({ children, variant = 'accent' }) {
  return (
    <span className={'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ' + (variants[variant] || variants.accent)}>
      {children}
    </span>
  );
}
