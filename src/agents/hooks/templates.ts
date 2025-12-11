import {
  createTemplate,
  getTemplateBySlug,
  listTemplates,
  type TemplateInput,
  type TemplateRecord,
} from "@/domain/templates";

export type CreateTemplateAgentInput = TemplateInput;
export type CreateTemplateAgentOutput = TemplateRecord;

export async function createTemplateAgentHook(
  input: CreateTemplateAgentInput,
): Promise<CreateTemplateAgentOutput> {
  return createTemplate(input);
}

export async function getTemplateAgentHook(
  businessId: string,
  slug: string,
): Promise<TemplateRecord | null> {
  return getTemplateBySlug(businessId, slug);
}

export async function listTemplatesAgentHook(
  businessId: string,
): Promise<TemplateRecord[]> {
  return listTemplates(businessId);
}
