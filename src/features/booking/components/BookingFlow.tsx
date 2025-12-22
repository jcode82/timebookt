"use client";

import { useMemo, useState, useTransition } from "react";
import type { AvailabilityBlock } from "@/domain/appointments";
import type { ServiceRecord } from "@/domain/services";
import { BOOKING_STEPS } from "@/lib/constants";
import { createBookingAction } from "@/features/booking/api/createBookingAction";

interface BookingFlowProps {
  businessId: string;
  businessSlug: string;
  services: ServiceRecord[];
  availability: AvailabilityBlock[];
}

export function BookingFlow({ businessId, businessSlug, services, availability }: BookingFlowProps) {
  const [step, setStep] = useState<(typeof BOOKING_STEPS)[number]>(BOOKING_STEPS[0]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<AvailabilityBlock | null>(null);
  const [formState, setFormState] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    notes: "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [selectedServiceId, services],
  );

  const canAdvance = () => {
    switch (step) {
      case "selectService":
        return Boolean(selectedServiceId);
      case "selectSlot":
        return Boolean(selectedBlock);
      case "confirm":
        return Boolean(formState.customerName && formState.customerEmail);
      default:
        return false;
    }
  };

  const goNext = () => {
    if (!canAdvance()) return;
    const idx = BOOKING_STEPS.indexOf(step);
    if (idx < BOOKING_STEPS.length - 1) {
      setStep(BOOKING_STEPS[idx + 1]);
    }
  };

  const goPrevious = () => {
    const idx = BOOKING_STEPS.indexOf(step);
    if (idx > 0) {
      setStep(BOOKING_STEPS[idx - 1]);
    }
  };

  const submitBooking = () => {
    if (!selectedService || !selectedBlock) {
      return;
    }
    if (!selectedBlock.staffId) {
      setFeedback("Please select a provider for this slot.");
      return;
    }
    startTransition(async () => {
      await createBookingAction({
        businessId,
        businessSlug,
        providerId: selectedBlock.staffId ?? "",
        serviceId: selectedService.id,
        startTime: selectedBlock.startTime,
        endTime: selectedBlock.endTime,
        customerName: formState.customerName,
        customerEmail: formState.customerEmail,
        customerPhone: formState.customerPhone,
        notes: formState.notes,
      });
      setFeedback("Appointment scheduled. Check your email for confirmation.");
      setStep(BOOKING_STEPS[0]);
      setSelectedServiceId(null);
      setSelectedBlock(null);
      setFormState({ customerName: "", customerEmail: "", customerPhone: "", notes: "" });
    });
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        {BOOKING_STEPS.map((currentStep) => (
          <span
            key={currentStep}
            className={`rounded-full px-3 py-1 ${step === currentStep ? "bg-slate-900 text-white" : "bg-slate-100"}`}
          >
            {currentStep}
          </span>
        ))}
      </div>

      {step === "selectService" && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setSelectedServiceId(service.id)}
              className={`text-left rounded-2xl border p-4 transition ${selectedServiceId === service.id ? "border-slate-900 bg-slate-900/5" : "border-slate-200"}`}
            >
              <p className="text-sm font-semibold text-slate-900">{service.name}</p>
              <p className="text-xs text-slate-500">{service.durationMinutes} min • {(service.priceCents / 100).toFixed(2)} {service.currency}</p>
            </button>
          ))}
          {services.length === 0 && <p className="text-sm text-slate-500">No services configured yet.</p>}
        </div>
      )}

      {step === "selectSlot" && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {availability.map((block) => (
            <button
              key={block.id}
              type="button"
              onClick={() => setSelectedBlock(block)}
              className={`text-left rounded-2xl border p-4 transition ${selectedBlock?.id === block.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}
            >
              <p className="text-sm font-semibold text-slate-900">
                {new Date(block.startTime).toLocaleString()} - {new Date(block.endTime).toLocaleTimeString()}
              </p>
              <p className="text-xs text-slate-500">Capacity: {block.capacity}</p>
            </button>
          ))}
          {availability.length === 0 && <p className="text-sm text-slate-500">No availability published.</p>}
        </div>
      )}

      {step === "confirm" && (
        <div className="mt-6 space-y-4">
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-2"
            placeholder="Full name"
            value={formState.customerName}
            onChange={(event) => setFormState((prev) => ({ ...prev, customerName: event.target.value }))}
          />
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-2"
            placeholder="Email"
            value={formState.customerEmail}
            onChange={(event) => setFormState((prev) => ({ ...prev, customerEmail: event.target.value }))}
          />
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-2"
            placeholder="Phone"
            value={formState.customerPhone}
            onChange={(event) => setFormState((prev) => ({ ...prev, customerPhone: event.target.value }))}
          />
          <textarea
            className="w-full rounded-2xl border border-slate-200 px-4 py-2"
            placeholder="Notes"
            value={formState.notes}
            onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
          />
          <button
            type="button"
            className="w-full rounded-full bg-emerald-500 px-5 py-3 font-semibold text-white"
            disabled={pending}
            onClick={submitBooking}
          >
            {pending ? "Booking..." : "Confirm appointment"}
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {step !== BOOKING_STEPS[0] && (
          <button
            type="button"
            onClick={goPrevious}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm"
          >
            Back
          </button>
        )}
        {step !== BOOKING_STEPS[BOOKING_STEPS.length - 1] && (
          <button
            type="button"
            disabled={!canAdvance()}
            onClick={goNext}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white disabled:bg-slate-500"
          >
            Continue
          </button>
        )}
      </div>

      {feedback && <p className="mt-4 text-sm text-emerald-600">{feedback}</p>}
    </section>
  );
}
