import {
  createBusiness,
  getBusinessBySlug,
  getBusinessDashboardMetrics,
  listBusinessesByRegion,
  type BusinessDashboardMetrics,
  type BusinessProfile,
  type CreateBusinessInput,
} from "@/domain/businesses";

export type CreateBusinessAgentInput = CreateBusinessInput;
export type CreateBusinessAgentOutput = BusinessProfile;

export async function createBusinessAgentHook(
  input: CreateBusinessAgentInput,
): Promise<CreateBusinessAgentOutput> {
  return createBusiness(input);
}

export async function getBusinessProfileAgentHook(
  slug: string,
): Promise<BusinessProfile | null> {
  return getBusinessBySlug(slug);
}

export async function listRegionalBusinessesAgentHook(
  regionCode: string,
): Promise<BusinessProfile[]> {
  return listBusinessesByRegion(regionCode);
}

export async function getBusinessDashboardAgentHook(
  businessId: string,
): Promise<BusinessDashboardMetrics> {
  return getBusinessDashboardMetrics(businessId);
}
