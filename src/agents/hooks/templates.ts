import {
  createTemplate,
  getTemplateBySlug,
  listTemplates,
  updateTemplate,
  type TemplateInput,
  type TemplateRecord,
  type UpdateTemplateInput,
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

export async function updateTemplateAgentHook(
  input: UpdateTemplateInput,
): Promise<TemplateRecord> {
  return updateTemplate(input);
}
