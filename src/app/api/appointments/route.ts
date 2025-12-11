import { NextResponse } from "next/server";
import { createAppointment, listAppointmentsForBusiness } from "@/domain/appointments";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }
  const appointments = await listAppointmentsForBusiness(businessId);
  return NextResponse.json({ appointments });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const appointment = await createAppointment(payload);
  return NextResponse.json(appointment, { status: 201 });
}
