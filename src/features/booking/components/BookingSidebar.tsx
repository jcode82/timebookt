import React from "react";

interface BookingSidebarProps {
  contactEmail: string;
  contactPhone?: string | null;
}

export function BookingSidebar({ contactEmail, contactPhone }: BookingSidebarProps) {
  return (
    <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
      <h2 className="text-base font-semibold text-slate-900">Need help?</h2>
      <p className="mt-2">Email: {contactEmail}</p>
      {contactPhone && <p>Phone: {contactPhone}</p>}
      <p className="mt-2 text-xs text-slate-500">
        Agents can trigger SMS/email reminders using the templates domain once the
        booking is confirmed.
      </p>
    </aside>
  );
}
