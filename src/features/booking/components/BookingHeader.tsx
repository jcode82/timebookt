interface BookingHeaderProps {
  businessName: string;
  description?: string | null;
}

export function BookingHeader({ businessName, description }: BookingHeaderProps) {
  return (
    <header className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm uppercase tracking-wide text-slate-500">Book with</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">{businessName}</h1>
      {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
    </header>
  );
}
