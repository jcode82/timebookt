const weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatDashboardDateTime(timestamp: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(timestamp));
}

export function formatPriceCents(priceCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
}

export function formatAvailabilityDay(dayOfWeek: number) {
  return weekdayLabels[dayOfWeek] ?? `Day ${dayOfWeek}`;
}

export function formatAvailabilityTimeRange(startTime: string, endTime: string) {
  return `${formatTimeOnly(startTime)} to ${formatTimeOnly(endTime)}`;
}

function formatTimeOnly(value: string) {
  const [hours, minutes] = value.split(":");
  const referenceDate = new Date(Date.UTC(2026, 0, 1, Number(hours), Number(minutes)));

  return timeFormatter.format(referenceDate);
}
