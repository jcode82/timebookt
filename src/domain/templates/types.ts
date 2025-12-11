import type { TEMPLATE_CHANNELS } from "@/lib/constants";

export type TemplateChannel = (typeof TEMPLATE_CHANNELS)[number];

export interface TemplateRecord {
  id: string;
  businessId: string;
  slug: string;
  channel: TemplateChannel;
  name: string;
  subject?: string | null;
  body: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateInput {
  businessId: string;
  slug: string;
  channel: TemplateChannel;
  name: string;
  subject?: string;
  body: string;
  locale: string;
}
