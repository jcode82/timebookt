import { NextResponse } from "next/server";
import { createCustomerAgentHook } from "@/agents/hooks/customers";
import { createAppointmentAgentHook } from "@/agents/hooks/appointments";

const actions = {
  createCustomer: createCustomerAgentHook,
  createAppointment: createAppointmentAgentHook,
};

type ActionKey = keyof typeof actions;

export async function POST(request: Request) {
  const body = await request.json();
  const action = body.action as ActionKey;
  if (!action || !(action in actions)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const result = await actions[action](body.payload);
  return NextResponse.json({ action, result });
}
