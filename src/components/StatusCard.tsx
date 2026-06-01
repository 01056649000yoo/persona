type StatusCardProps = {
  label: string;
  value: string;
  description: string;
};

export default function StatusCard({ label, value, description }: StatusCardProps) {
  return (
    <article className="stat">
      <div className="section-label">{label}</div>
      <div className="stat-value">{value}</div>
      <p className="muted">{description}</p>
    </article>
  );
}
