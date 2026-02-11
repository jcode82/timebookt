import {
  cancelAppointment,
  createCanonicalAppointment,
  getAvailability,
  listAppointmentsForBusiness,
  type AppointmentRecord,
  type AvailabilityBlock,
  type AvailabilityRequest,
  type CancelAppointmentInput,
  type CanonicalAppointmentInput,
} from "@/domain/appointments";

export type CreateAppointmentAgentInput = CanonicalAppointmentInput;
export type CreateAppointmentAgentOutput = AppointmentRecord;

export async function createAppointmentAgentHook(
  input: CreateAppointmentAgentInput,
): Promise<CreateAppointmentAgentOutput> {
  return createCanonicalAppointment({
    ...input,
    actorType: input.actorType ?? "ai",
  });
}

export async function cancelAppointmentAgentHook(
  input: CancelAppointmentInput,
): Promise<AppointmentRecord> {
  return cancelAppointment({
    ...input,
    actorType: input.actorType ?? "ai",
  });
}

export async function listAppointmentsAgentHook(
  businessId: string,
): Promise<AppointmentRecord[]> {
  return listAppointmentsForBusiness(businessId);
}

export async function queryAvailabilityAgentHook(
  request: AvailabilityRequest,
): Promise<AvailabilityBlock[]> {
  return getAvailability(request);
}
