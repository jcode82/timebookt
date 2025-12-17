import type { AgentAction } from "@/agents/agentTypes";
import { createBusinessAgentHook } from "@/agents/hooks/businesses";
import { createCustomerAgentHook } from "@/agents/hooks/customers";
import { createAppointmentAgentHook } from "@/agents/hooks/appointments";
import { updateTemplateAgentHook } from "@/agents/hooks/templates";

export async function agentRouter(action: AgentAction) {
  switch (action.type) {
    case "createBusiness":
      return createBusinessAgentHook(action.payload);
    case "createCustomer":
      return createCustomerAgentHook(action.payload);
    case "createAppointment":
      return createAppointmentAgentHook(action.payload);
    case "updateTemplate":
      return updateTemplateAgentHook(action.payload);
    default: {
      const exhaustiveCheck: never = action;
      throw new Error(`Unsupported agent action: ${exhaustiveCheck}`);
    }
  }
}
