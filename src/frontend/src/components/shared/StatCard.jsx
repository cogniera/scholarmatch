export default function StatCard({ title, value, icon: Icon, trend, color = 'brand-accent' }) {
  return (
    <div className="glass-card p-5">
      <div className="flex justify-between items-start mb-4">
        <div className={'p-3 rounded-lg bg-' + color + '/10'}>
          <Icon size={22} className={'text-' + color} />
        </div>
        {trend && (
          <span className="text-xs font-semibold px-2 py-1 bg-brand-success/10 text-brand-success rounded-full">{trend}</span>
        )}
      </div>
      <p className="text-sm text-brand-muted mb-1">{title}</p>
      <h3 className="text-2xl font-display font-bold text-brand-text">{value}</h3>
    </div>
  );
}
