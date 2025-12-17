import { TABLES } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { REGION } from "@/lib/env";
import type { Tables, TablesInsert, TablesUpdate } from "../../../supabase/types";
import type { TemplateInput, TemplateRecord, UpdateTemplateInput } from "./types";

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
    region_code: REGION,
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
    .eq("region_code", REGION)
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
    .eq("region_code", REGION)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new DomainError("Unable to load template", { error, slug });
  }

  return data ? mapTemplate(data) : null;
}

export async function updateTemplate(input: UpdateTemplateInput): Promise<TemplateRecord> {
  const supabase = getSupabaseAdmin();
  const payload: TablesUpdate<typeof TABLES.templates> = {};

  if (typeof input.name !== "undefined") payload.name = input.name;
  if (typeof input.subject !== "undefined") payload.subject = input.subject;
  if (typeof input.body !== "undefined") payload.body = input.body;
  if (typeof input.locale !== "undefined") payload.locale = input.locale;

  const { data, error } = await supabase
    .from(TABLES.templates)
    .update(payload)
    .eq("id", input.templateId)
    .eq("business_id", input.businessId)
    .eq("region_code", REGION)
    .select()
    .single();

  if (error || !data) {
    throw new DomainError("Unable to update template", { error, input });
  }

  return mapTemplate(data);
}
