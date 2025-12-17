import { notFound } from "next/navigation";
import { getDashboardData } from "@/features/dashboard/api/getDashboardData";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { MetricsGrid } from "@/features/dashboard/components/MetricsGrid";
import { AppointmentsPanel } from "@/features/dashboard/components/AppointmentsPanel";
import { CustomersPanel } from "@/features/dashboard/components/CustomersPanel";
import { AuditLogPanel } from "@/features/dashboard/components/AuditLogPanel";

interface DashboardPageProps {
  params: Promise<{ slug: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { slug } = await params;
  const data = await getDashboardData(slug);

  if (!data) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12">
      <DashboardHeader businessName={data.businessName} slug={data.slug} />
      <MetricsGrid metrics={data.metrics} />
      <div className="grid gap-6 md:grid-cols-2">
        <AppointmentsPanel appointments={data.appointments} />
        <CustomersPanel customers={data.customers} />
      </div>
      <AuditLogPanel metrics={data.metrics} />
    </div>
  );
}
