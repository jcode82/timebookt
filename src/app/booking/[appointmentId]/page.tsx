import { notFound } from "next/navigation";
import { getBookingStatus } from "@/domain/appointments";

interface BookingStatusPageProps {
  params: { appointmentId: string };
  searchParams?: { token?: string };
}

export default async function BookingStatusPage({ params }: BookingStatusPageProps) {
  const booking = await getBookingStatus(params.appointmentId);

  if (!booking) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">Booking status</h1>
      <p className="mt-2 text-sm text-slate-500">Reference: {booking.appointmentId}</p>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Status</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{booking.status}</p>

        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <p>Service: {booking.service}</p>
          <p>Provider: {booking.provider || "Assigned soon"}</p>
          <p>
            Time: {new Date(booking.startTime).toLocaleString()} -{" "}
            {new Date(booking.endTime).toLocaleTimeString()}
          </p>
          <p>Customer: {booking.customerName}</p>
          <p>Contact: {booking.customerEmail}</p>
        </div>
      </div>
    </div>
  );
}
