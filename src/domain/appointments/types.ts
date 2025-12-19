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
