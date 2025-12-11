export interface CustomerProfile {
  id: string;
  businessId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  locale?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  businessId: string;
  name: string;
  email: string;
  phone?: string;
  locale?: string;
}

export interface CustomerFilter {
  businessId: string;
  query?: string;
  limit?: number;
}
