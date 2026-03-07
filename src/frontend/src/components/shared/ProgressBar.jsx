export default function ProgressBar({ value, max = 100, color = 'brand-accent', height = 'h-2' }) {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  return (
    <div className={'w-full bg-brand-border rounded-full overflow-hidden ' + height}>
      <div className={'rounded-full transition-all duration-500 ' + height + ' bg-' + color} style={{ width: pct + '%' }} />
    </div>
  );
}
