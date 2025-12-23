import { notFound } from "next/navigation";
import { getBookingContext } from "@/features/booking/api/getBookingContext";
import { BookingHeader } from "@/features/booking/components/BookingHeader";
import { BookingFlow } from "@/features/booking/components/BookingFlow";
import { BookingSidebar } from "@/features/booking/components/BookingSidebar";

interface BookingPageProps {
  params: Promise<{ businessSlug: string }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { businessSlug } = await params;
  const context = await getBookingContext(businessSlug);

  if (!context) {
    notFound();
  }

  const { business, services, providers } = context;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
      <BookingHeader businessName={business.name} description={business.description} />
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <BookingFlow
          businessId={business.id}
          businessSlug={business.slug}
          services={services}
          providers={providers}
        />
        <BookingSidebar contactEmail={business.contactEmail} contactPhone={business.contactPhone} />
      </div>
    </div>
  );
}
