type PageHeaderProps = {
  label: string;
  title: string;
  description: string;
};

export default function PageHeader({ label, title, description }: PageHeaderProps) {
  return (
    <header>
      <div className="section-label">{label}</div>
      <h1 className="page-title">{title}</h1>
      <p className="page-copy">{description}</p>
    </header>
  );
}
