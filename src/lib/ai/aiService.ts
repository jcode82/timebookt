import { createBusinessAgentHook } from "@/agents/hooks/businesses";
import { createCustomerAgentHook } from "@/agents/hooks/customers";
import { createAppointmentAgentHook } from "@/agents/hooks/appointments";
import { createTemplateAgentHook } from "@/agents/hooks/templates";

export type AgentDomain = "businesses" | "customers" | "appointments" | "templates";

export interface AgentJob<Input = unknown> {
  id: string;
  domain: AgentDomain;
  action: string;
  payload: Input;
}

const actionRouter: Record<AgentDomain, Record<string, (payload: any) => Promise<any>>> = {
  businesses: {
    create: createBusinessAgentHook,
  },
  customers: {
    create: createCustomerAgentHook,
  },
  appointments: {
    create: createAppointmentAgentHook,
  },
  templates: {
    create: createTemplateAgentHook,
  },
};

export async function executeAgentJob(job: AgentJob) {
  const domainHandlers = actionRouter[job.domain];
  const handler = domainHandlers?.[job.action];
  if (!handler) {
    throw new Error(`Missing agent handler for ${job.domain}:${job.action}`);
  }

  return handler(job.payload);
}
