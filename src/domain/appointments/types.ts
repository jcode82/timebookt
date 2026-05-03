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

export interface AppointmentAdminRecord extends AppointmentRecord {
  serviceName: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  providerName: string | null;
}

export interface ListAppointmentsForBusinessOptions {
  limit?: number;
  statuses?: AppointmentStatus[];
  onlyUpcoming?: boolean;
  date?: string;
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
  actorType?: "system" | "user" | "staff" | "ai";
  actorId?: string | null;
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
  actorType?: "system" | "user" | "staff" | "ai";
  actorId?: string | null;
}

export interface RescheduleAppointmentInput {
  appointmentId: string;
  startTime: string;
  endTime: string;
  reason?: string;
  source?: string;
  actorType?: "system" | "user" | "staff" | "ai";
  actorId?: string | null;
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

export interface AvailabilityException {
  id: string;
  businessId: string;
  staffId: string;
  exceptionDate: string;
  isClosed: boolean;
  startTime?: string | null;
  endTime?: string | null;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityRequest {
  businessId: string;
  providerId?: string;
  dayOfWeek?: number;
}

export interface AvailabilityExceptionRequest {
  businessId: string;
  providerId?: string;
}

export interface CreateAvailabilityBlockInput {
  businessId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity?: number;
}

export interface UpdateAvailabilityBlockInput {
  availabilityBlockId: string;
  businessId: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  capacity?: number;
}

export interface DeleteAvailabilityBlockInput {
  availabilityBlockId: string;
  businessId: string;
}

export interface CreateAvailabilityExceptionInput {
  businessId: string;
  staffId: string;
  exceptionDate: string;
  isClosed: boolean;
  startTime?: string | null;
  endTime?: string | null;
  capacity?: number;
}

export interface UpdateAvailabilityExceptionInput {
  availabilityExceptionId: string;
  businessId: string;
  staffId?: string;
  exceptionDate?: string;
  isClosed?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  capacity?: number;
}

export interface DeleteAvailabilityExceptionInput {
  availabilityExceptionId: string;
  businessId: string;
}
