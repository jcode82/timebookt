import { TABLES } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { rpcCall } from "@/lib/supabase/rpc";
import { REGION } from "@/lib/env";
import type { Tables, TablesInsert } from "../../../supabase/types";
import type {
  BookedCustomerSummary,
  CreateCustomerInput,
  CustomerFilter,
  CustomerProfile,
} from "./types";

const mapCustomer = (row: Tables<typeof TABLES.customers>): CustomerProfile => ({
  id: row.id,
  businessId: row.business_id,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  locale: row.locale,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function createCustomer(input: CreateCustomerInput): Promise<CustomerProfile> {
  const supabase = getSupabaseAdmin();
  const insert: TablesInsert<typeof TABLES.customers> = {
    business_id: input.businessId,
    region_code: REGION,
    full_name: input.name,
    email: input.email,
    phone: input.phone,
    locale: input.locale,
  };

  const { data, error } = await rpcCall<Tables<typeof TABLES.customers>>(supabase, "create_customer", {
    business_id: insert.business_id,
    region_code: insert.region_code ?? REGION,
    full_name: insert.full_name,
    email: insert.email,
    phone: insert.phone ?? null,
    locale: insert.locale ?? null,
  });

  if (error || !data) {
    throw new DomainError("Unable to create customer", { error });
  }

  return mapCustomer(data);
}

export async function getCustomerByEmail(businessId: string, email: string): Promise<CustomerProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLES.customers)
    .select()
    .eq("business_id", businessId)
    .eq("region_code", REGION)
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    throw new DomainError("Unable to load customer", { error, email });
  }

  return data ? mapCustomer(data) : null;
}

export async function listCustomers(filter: CustomerFilter): Promise<CustomerProfile[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from(TABLES.customers)
    .select()
    .eq("business_id", filter.businessId)
    .eq("region_code", REGION)
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 20);

  if (filter.query) {
    query = query.or(
      `full_name.ilike.%${filter.query}%,email.ilike.%${filter.query}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    const message = error.message ?? "Unable to list customers";
    if (message.includes("column") && message.includes("region_code")) {
      throw new DomainError(
        "Customers table is missing the region_code column. Run supabase/schema.sql migrations.",
        { error, filter },
      );
    }
    throw new DomainError("Unable to list customers", { error, filter });
  }

  return (data ?? []).map(mapCustomer);
}

export async function listBookedCustomersForBusiness(
  filter: CustomerFilter,
): Promise<BookedCustomerSummary[]> {
  const supabase = getSupabaseAdmin();
  const appointmentsQuery = supabase
    .from(TABLES.appointments)
    .select("customer_id, start_time")
    .eq("business_id", filter.businessId)
    .eq("region_code", REGION)
    .order("start_time", { ascending: false });

  const { data: appointmentRows, error: appointmentsError } = await appointmentsQuery;

  if (appointmentsError) {
    throw new DomainError("Unable to load customer bookings", {
      error: appointmentsError,
      filter,
    });
  }

  if (!appointmentRows || appointmentRows.length === 0) {
    return [];
  }

  const bookingCountsByCustomerId = new Map<string, number>();
  const latestBookingByCustomerId = new Map<string, string>();

  for (const appointment of appointmentRows) {
    bookingCountsByCustomerId.set(
      appointment.customer_id,
      (bookingCountsByCustomerId.get(appointment.customer_id) ?? 0) + 1,
    );

    if (!latestBookingByCustomerId.has(appointment.customer_id)) {
      latestBookingByCustomerId.set(appointment.customer_id, appointment.start_time);
    }
  }

  let customersQuery = supabase
    .from(TABLES.customers)
    .select()
    .eq("business_id", filter.businessId)
    .eq("region_code", REGION)
    .in("id", [...bookingCountsByCustomerId.keys()]);

  if (filter.query) {
    customersQuery = customersQuery.or(
      `full_name.ilike.%${filter.query}%,email.ilike.%${filter.query}%`,
    );
  }

  const { data, error } = await customersQuery;

  if (error) {
    throw new DomainError("Unable to load booked customers", { error, filter });
  }

  const customers = (data ?? [])
    .map(mapCustomer)
    .map((customer) => ({
      ...customer,
      bookingCount: bookingCountsByCustomerId.get(customer.id) ?? 0,
    }))
    .filter((customer) => customer.bookingCount > 0)
    .sort((left, right) => {
      if (right.bookingCount !== left.bookingCount) {
        return right.bookingCount - left.bookingCount;
      }

      const leftLatestBooking = latestBookingByCustomerId.get(left.id) ?? left.createdAt;
      const rightLatestBooking = latestBookingByCustomerId.get(right.id) ?? right.createdAt;

      return rightLatestBooking.localeCompare(leftLatestBooking);
    });

  if (typeof filter.limit === "number") {
    return customers.slice(0, filter.limit);
  }

  return customers;
}
