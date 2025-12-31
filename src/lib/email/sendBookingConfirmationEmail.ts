import { Resend } from "resend";

interface BookingConfirmationEmailInput {
  to: string;
  service: string;
  provider: string;
  startTime: string;
}

export async function sendBookingConfirmationEmail(
  input: BookingConfirmationEmailInput,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    console.warn("Resend is not configured; skipping booking confirmation email.");
    return;
  }

  const resend = new Resend(apiKey);
  const start = new Date(input.startTime).toLocaleString();
  const subject = `Your booking is confirmed for ${start}`;

  await resend.emails.send({
    from,
    to: input.to,
    subject,
    text: `Your appointment is confirmed.\n\nService: ${input.service}\nProvider: ${input.provider}\nWhen: ${start}\n\nThanks for booking with TimeBookt.`,
  });
}
