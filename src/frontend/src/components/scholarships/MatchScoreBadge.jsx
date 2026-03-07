export default function MatchScoreBadge({ score }) {
  let color = 'brand-danger';
  if (score >= 80) color = 'brand-success';
  else if (score >= 60) color = 'brand-warning';

  return (
    <div className="flex flex-col items-end">
      <span className={'text-2xl font-display font-black leading-none text-' + color}>{score}%</span>
      <span className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mt-0.5">Match</span>
    </div>
  );
}
