export interface ServiceRecord {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  isActive: boolean;
}

export interface CreateServiceInput {
  businessId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  priceCents: number;
  currency?: string;
}
