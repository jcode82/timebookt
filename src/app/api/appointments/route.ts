import { NextResponse } from "next/server";
import {
  cancelAppointment,
  createCanonicalAppointment,
  listAppointmentAdminRecordsForBusiness,
  type AppointmentStatus,
} from "@/domain/appointments";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const date = searchParams.get("date");
  const status = searchParams.get("status");
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const statuses: AppointmentStatus[] | undefined =
    status && status !== "all" ? [status as AppointmentStatus] : undefined;

  try {
    const appointments = await listAppointmentAdminRecordsForBusiness(businessId, {
      date: date ?? undefined,
      statuses,
    });
    return NextResponse.json({ appointments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load appointments";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const appointment = await createCanonicalAppointment(payload);
    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create appointment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as {
      appointmentId?: string;
      status?: AppointmentStatus;
      cancellationReason?: string | null;
    };

    if (!payload.appointmentId) {
      return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });
    }

    if (payload.status && payload.status !== "canceled") {
      return NextResponse.json({ error: "Only canceled status updates are supported" }, { status: 400 });
    }

    const appointment = await cancelAppointment({
      appointmentId: payload.appointmentId,
      cancellationReason: payload.cancellationReason ?? undefined,
    });

    return NextResponse.json(appointment, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to cancel appointment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
