interface DashboardHeaderProps {
  businessName: string;
  slug: string;
}

export function DashboardHeader({ businessName, slug }: DashboardHeaderProps) {
  return (
    <header className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm uppercase tracking-wide text-slate-500">Admin</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">{businessName}</h1>
      <p className="text-sm text-slate-500">Slug: {slug}</p>
    </header>
  );
}
