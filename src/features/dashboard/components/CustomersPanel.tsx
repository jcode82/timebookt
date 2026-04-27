import type { CustomerProfile } from "@/domain/customers";

interface CustomersPanelProps {
  customers: CustomerProfile[];
}

export function CustomersPanel({ customers }: CustomersPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Recent customers</h2>
      <ul className="mt-4 space-y-3">
        {customers.map((customer) => (
          <li key={customer.id} className="rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-medium text-slate-900">{customer.fullName}</p>
            <p className="text-xs text-slate-500">{customer.email}</p>
          </li>
        ))}
        {customers.length === 0 && (
          <li className="text-sm text-slate-500">No customers yet.</li>
        )}
      </ul>
    </section>
  );
}
