import { TABLES } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "../../../supabase/types";
import type { TemplateInput, TemplateRecord } from "./types";

const mapTemplate = (row: Tables<typeof TABLES.templates>): TemplateRecord => ({
  id: row.id,
  businessId: row.business_id,
  slug: row.slug,
  channel: row.channel as TemplateRecord["channel"],
  name: row.name,
  subject: row.subject,
  body: row.body,
  locale: row.locale,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function createTemplate(input: TemplateInput): Promise<TemplateRecord> {
  const supabase = getSupabaseAdmin();
  const payload: TablesInsert<typeof TABLES.templates> = {
    business_id: input.businessId,
    slug: input.slug,
    channel: input.channel,
    name: input.name,
    subject: input.subject,
    body: input.body,
    locale: input.locale,
  };

  const { data, error } = await supabase
    .from(TABLES.templates)
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    throw new DomainError("Unable to create template", { error, input });
  }

  return mapTemplate(data);
}

export async function listTemplates(businessId: string): Promise<TemplateRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLES.templates)
    .select()
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new DomainError("Unable to list templates", { error, businessId });
  }

  return (data ?? []).map(mapTemplate);
}

export async function getTemplateBySlug(
  businessId: string,
  slug: string,
): Promise<TemplateRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLES.templates)
    .select()
    .eq("business_id", businessId)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new DomainError("Unable to load template", { error, slug });
  }

  return data ? mapTemplate(data) : null;
}
