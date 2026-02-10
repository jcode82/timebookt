import { Resend } from "resend";

interface AppointmentReminderEmailInput {
  to: string;
  service: string;
  provider: string;
  startTime: string;
  hoursBefore: number;
}

export class ProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigurationError";
  }
}

export async function sendAppointmentReminderEmail(
  input: AppointmentReminderEmailInput,
): Promise<{ messageId?: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    throw new ProviderConfigurationError("Resend is not configured");
  }

  const resend = new Resend(apiKey);
  const start = new Date(input.startTime).toLocaleString();
  const subject = `Reminder: appointment in ${input.hoursBefore}h`;

  const response = await resend.emails.send({
    from,
    to: input.to,
    subject,
    text: `Reminder: you have an appointment scheduled in ${input.hoursBefore} hours.\n\nService: ${input.service}\nProvider: ${input.provider}\nWhen: ${start}\n\nSee you soon!`,
  });

  return { messageId: (response as { data?: { id?: string } })?.data?.id ?? null };
}
