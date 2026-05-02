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

export interface UpdateServiceInput {
  serviceId: string;
  businessId: string;
  name?: string;
  description?: string | null;
  durationMinutes?: number;
  priceCents?: number;
  currency?: string;
  isActive?: boolean;
}

export interface ListServicesOptions {
  includeInactive?: boolean;
}
