import { NextResponse } from "next/server";
import { rescheduleAppointment } from "@/domain/appointments";

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as {
      appointmentId?: string;
      startTime?: string;
      endTime?: string;
      reason?: string | null;
      source?: string | null;
    };

    if (!payload.appointmentId) {
      return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });
    }

    if (!payload.startTime || !payload.endTime) {
      return NextResponse.json({ error: "startTime and endTime are required" }, { status: 400 });
    }

    const appointment = await rescheduleAppointment({
      appointmentId: payload.appointmentId,
      startTime: payload.startTime,
      endTime: payload.endTime,
      reason: payload.reason ?? undefined,
      source: payload.source ?? "api",
    });

    return NextResponse.json(appointment, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reschedule appointment";
    const details =
      error instanceof Error && "context" in error
        ? (error as { context?: Record<string, unknown> }).context
        : undefined;
    return NextResponse.json({ error: message, details }, { status: 400 });
  }
}
