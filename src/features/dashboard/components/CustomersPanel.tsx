import React from "react";
import type { BookedCustomerSummary } from "@/domain/customers";

interface CustomersPanelProps {
  customers: BookedCustomerSummary[];
}

export function CustomersPanel({ customers }: CustomersPanelProps) {
  return (
    <section id="customers" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Customers</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Customer management</h2>
          <p className="mt-2 text-sm text-slate-500">
            Review customers who have booked appointments. This view is read-only for now.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Booked customers</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{customers.length}</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-left">
              <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Name
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Email
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Booking count
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Appointments
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="align-top">
                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-950">{customer.fullName}</p>
                </td>
                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-500">
                  {customer.email}
                </td>
                <td className="border-b border-slate-100 px-4 py-4 text-sm font-medium text-slate-950">
                  {customer.bookingCount}
                </td>
                <td className="border-b border-slate-100 px-4 py-4 text-right text-sm">
                  <a href="#appointments" className="font-medium text-slate-600 transition hover:text-slate-950">
                    View appointments
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {customers.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No booked customers yet.</p>
      ) : null}
    </section>
  );
}
