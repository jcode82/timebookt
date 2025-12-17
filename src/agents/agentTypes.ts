import type { CreateBusinessInput } from "@/domain/businesses";
import type { CreateCustomerInput } from "@/domain/customers";
import type { CreateAppointmentInput } from "@/domain/appointments";
import type { UpdateTemplateInput } from "@/domain/templates";

export type AgentAction =
  | { type: "createBusiness"; payload: CreateBusinessInput }
  | { type: "createCustomer"; payload: CreateCustomerInput }
  | { type: "createAppointment"; payload: CreateAppointmentInput }
  | { type: "updateTemplate"; payload: UpdateTemplateInput };
