import { Resend } from "resend";

interface AppointmentReminderEmailInput {
  to: string;
  service: string;
  provider: string;
  startTime: string;
  hoursBefore: number;
}

export async function sendAppointmentReminderEmail(
  input: AppointmentReminderEmailInput,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    console.warn("Resend is not configured; skipping reminder email.");
    return;
  }

  const resend = new Resend(apiKey);
  const start = new Date(input.startTime).toLocaleString();
  const subject = `Reminder: appointment in ${input.hoursBefore}h`;

  await resend.emails.send({
    from,
    to: input.to,
    subject,
    text: `Reminder: you have an appointment scheduled in ${input.hoursBefore} hours.\n\nService: ${input.service}\nProvider: ${input.provider}\nWhen: ${start}\n\nSee you soon!`,
  });
}
