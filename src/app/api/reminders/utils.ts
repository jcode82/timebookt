export type ReminderAppointment = {
  status: string;
};

export const filterRemindableAppointments = <T extends ReminderAppointment>(
  appointments: T[],
): T[] => appointments.filter((appointment) => appointment.status === "scheduled");
