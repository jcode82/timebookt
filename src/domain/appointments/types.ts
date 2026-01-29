export type AppointmentStatus = "scheduled" | "canceled" | "completed";

export interface AppointmentRecord {
  id: string;
  businessId: string;
  customerId: string;
  serviceId: string;
  staffId?: string | null;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentInput {
  businessId: string;
  customerId: string;
  serviceId: string;
  staffId?: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface CanonicalAppointmentInput {
  serviceId: string;
  providerId: string;
  regionCode: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
}

export interface ProviderAvailabilityRequest {
  businessId: string;
  providerId: string;
  date: string;
}

export interface ProviderAvailabilitySlot {
  startTime: string;
  endTime: string;
}

export interface BookingStatusDetails {
  appointmentId: string;
  service: string;
  provider: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  customerName: string;
  customerEmail: string;
}

export interface CancelAppointmentInput {
  appointmentId: string;
  cancellationReason?: string;
}

export interface AvailabilityBlock {
  id: string;
  businessId: string;
  staffId?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
}

export interface AvailabilityRequest {
  businessId: string;
  startDate: string;
  endDate: string;
}
