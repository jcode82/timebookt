import React from "react";
import { notFound, redirect } from "next/navigation";
import { getDashboardData } from "@/features/dashboard/api/getDashboardData";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { MetricsGrid } from "@/features/dashboard/components/MetricsGrid";
import { AppointmentsPanel } from "@/features/dashboard/components/AppointmentsPanel";
import { CustomersPanel } from "@/features/dashboard/components/CustomersPanel";
import { ServicesPanel } from "@/features/dashboard/components/ServicesPanel";
import { AvailabilityPanel } from "@/features/dashboard/components/AvailabilityPanel";
import { AvailabilityExceptionsPanel } from "@/features/dashboard/components/AvailabilityExceptionsPanel";

interface DashboardPageProps {
  params: Promise<{ slug: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { slug } = await params;
  const data = await getDashboardData(slug);

  if (!data) {
    notFound();
  }

  if (!data.isOnboarded) {
    redirect("/onboarding");
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <DashboardHeader businessName={data.businessName} slug={data.slug} timezone={data.timezone} />
        <DashboardSidebar
          businessSlug={data.slug}
          customersCount={data.customers.length}
          upcomingAppointments={data.metrics.upcomingAppointments}
          servicesCount={data.services.length}
          availabilityCount={data.availability.length}
          availabilityExceptionsCount={data.availabilityExceptions.length}
        />
      </aside>
      <main className="space-y-8">
        <section id="overview" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Overview</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Operations at a glance</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Track booking volume, review the next appointments, and move between the core admin sections.
          </p>
          <div className="mt-6">
            <MetricsGrid metrics={data.metrics} />
          </div>
        </section>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <AppointmentsPanel businessId={data.businessId} timezone={data.timezone} />
          <div className="space-y-8">
            <CustomersPanel customers={data.customers} />
            <ServicesPanel
              businessId={data.businessId}
              businessSlug={data.slug}
              services={data.services}
            />
            <AvailabilityPanel
              businessId={data.businessId}
              businessSlug={data.slug}
              availability={data.availability}
            />
            <AvailabilityExceptionsPanel
              businessId={data.businessId}
              businessSlug={data.slug}
              staffMembers={data.staffMembers}
              availabilityExceptions={data.availabilityExceptions}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
