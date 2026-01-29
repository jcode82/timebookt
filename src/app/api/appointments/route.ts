import { NextResponse } from "next/server";
import {
  cancelAppointment,
  createCanonicalAppointment,
  listAppointmentsForBusiness,
} from "@/domain/appointments";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }
  try {
    const appointments = await listAppointmentsForBusiness(businessId);
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
      cancellationReason?: string | null;
    };

    if (!payload.appointmentId) {
      return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });
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
