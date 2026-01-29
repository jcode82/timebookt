import type { ProviderAvailabilitySlot } from "./types";

export const parseTimestamp = (value: string): Date | null => {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const normalized = value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const fallback = new Date(normalized);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
};

export const dedupeAndSortSlots = (
  slots: ProviderAvailabilitySlot[],
): ProviderAvailabilitySlot[] => {
  const uniqueSlots = new Map<string, ProviderAvailabilitySlot>();
  for (const slot of slots) {
    uniqueSlots.set(`${slot.startTime}_${slot.endTime}`, slot);
  }

  return Array.from(uniqueSlots.values()).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
};
