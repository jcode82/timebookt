import {
  createCustomer,
  getCustomerByEmail,
  listCustomers,
  type CreateCustomerInput,
  type CustomerFilter,
  type CustomerProfile,
} from "@/domain/customers";

export type CreateCustomerAgentInput = CreateCustomerInput;
export type CreateCustomerAgentOutput = CustomerProfile;

export async function createCustomerAgentHook(
  input: CreateCustomerAgentInput,
): Promise<CreateCustomerAgentOutput> {
  return createCustomer(input);
}

export async function findCustomerByEmailAgentHook(
  businessId: string,
  email: string,
): Promise<CustomerProfile | null> {
  return getCustomerByEmail(businessId, email);
}

export type ListCustomersAgentInput = CustomerFilter;

export async function listCustomersAgentHook(
  input: ListCustomersAgentInput,
): Promise<CustomerProfile[]> {
  return listCustomers(input);
}
