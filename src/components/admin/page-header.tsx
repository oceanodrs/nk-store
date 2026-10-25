export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Notice({ tone = "success", children }: { tone?: "success" | "error"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`mb-6 rounded-xl px-4 py-3 text-sm font-semibold ${
        tone === "error" ? "bg-danger/10 text-danger" : "bg-lime-soft text-ink"
      }`}
    >
      {children}
    </p>
  );
}
