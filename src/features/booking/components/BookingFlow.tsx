"use client";

import { useMemo, useState, useTransition } from "react";
import type { ProviderAvailabilitySlot } from "@/domain/appointments";
import type { ServiceRecord } from "@/domain/services";
import { BOOKING_STEPS } from "@/lib/constants";
import { createBookingAction, type BookingConfirmation } from "@/features/booking/api/createBookingAction";
import { getProviderAvailabilityAction } from "@/features/booking/api/getProviderAvailabilityAction";

interface ProviderOption {
  id: string;
  name: string;
}

interface BookingFlowProps {
  businessId: string;
  businessSlug: string;
  services: ServiceRecord[];
  providers: ProviderOption[];
}

const formatDateInput = (value: Date) => value.toISOString().slice(0, 10);

export function BookingFlow({ businessId, businessSlug, services, providers }: BookingFlowProps) {
  const [step, setStep] = useState<(typeof BOOKING_STEPS)[number]>(BOOKING_STEPS[0]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(services[0]?.id ?? null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(providers[0]?.id ?? null);
  const [selectedDate, setSelectedDate] = useState<string>(formatDateInput(new Date()));
  const [slots, setSlots] = useState<ProviderAvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ProviderAvailabilitySlot | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
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

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedProviderId) ?? null,
    [providers, selectedProviderId],
  );

  const fetchSlots = (providerId: string, date: string) => {
    startTransition(async () => {
      const result = await getProviderAvailabilityAction({ providerId, date });
      setSlots(result);
      setSelectedSlot(result[0] ?? null);
    });
  };

  const canAdvance = () => {
    switch (step) {
      case "selectService":
        return Boolean(selectedServiceId);
      case "selectProvider":
        return Boolean(selectedProviderId);
      case "selectSlot":
        return Boolean(selectedSlot);
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
      const nextStep = BOOKING_STEPS[idx + 1];
      setStep(nextStep);
      if (nextStep === "selectSlot" && selectedProviderId) {
        fetchSlots(selectedProviderId, selectedDate);
      }
    }
  };

  const goPrevious = () => {
    const idx = BOOKING_STEPS.indexOf(step);
    if (idx > 0) {
      setStep(BOOKING_STEPS[idx - 1]);
    }
  };

  const submitBooking = () => {
    if (!selectedService || !selectedProvider || !selectedSlot) {
      return;
    }
    startTransition(async () => {
      try {
        const confirmation = await createBookingAction({
          businessId,
          businessSlug,
          providerId: selectedProvider.id,
          serviceId: selectedService.id,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          customerName: formState.customerName,
          customerEmail: formState.customerEmail,
          customerPhone: formState.customerPhone,
          notes: formState.notes,
        });
        setConfirmation(confirmation);
        setFeedback(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to book appointment";
        setFeedback(message);
      }
    });
  };

  const handleReset = () => {
    setFeedback(null);
    setConfirmation(null);
    setStep(BOOKING_STEPS[0]);
    setSelectedServiceId(services[0]?.id ?? null);
    setSelectedProviderId(providers[0]?.id ?? null);
    setSelectedSlot(null);
    setSlots([]);
    setFormState({ customerName: "", customerEmail: "", customerPhone: "", notes: "" });
  };

  if (confirmation) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Booking confirmed</h2>
        <p className="mt-2 text-sm text-slate-600">Appointment ID: {confirmation.appointmentId}</p>
        <p className="mt-2 text-sm text-slate-600">Service: {confirmation.service}</p>
        <p className="mt-2 text-sm text-slate-600">Provider: {confirmation.provider}</p>
        <p className="mt-2 text-sm text-slate-600">
          Start: {new Date(confirmation.startTime).toLocaleString()}
        </p>
        <button
          type="button"
          className="mt-6 rounded-full border border-slate-200 px-4 py-2 text-sm"
          onClick={handleReset}
        >
          Book another
        </button>
      </section>
    );
  }

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
              className={`rounded-2xl border p-4 text-left transition ${selectedServiceId === service.id ? "border-slate-900 bg-slate-900/5" : "border-slate-200"}`}
            >
              <p className="text-sm font-semibold text-slate-900">{service.name}</p>
              <p className="text-xs text-slate-500">
                {service.durationMinutes} min - {(service.priceCents / 100).toFixed(2)} {service.currency}
              </p>
            </button>
          ))}
          {services.length === 0 && <p className="text-sm text-slate-500">No services configured yet.</p>}
        </div>
      )}

      {step === "selectProvider" && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {providers.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => setSelectedProviderId(provider.id)}
              className={`rounded-2xl border p-4 text-left transition ${selectedProviderId === provider.id ? "border-slate-900 bg-slate-900/5" : "border-slate-200"}`}
            >
              <p className="text-sm font-semibold text-slate-900">{provider.name}</p>
            </button>
          ))}
          {providers.length === 0 && <p className="text-sm text-slate-500">No providers configured yet.</p>}
        </div>
      )}

      {step === "selectSlot" && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-600" htmlFor="booking-date">
              Date
            </label>
            <input
              id="booking-date"
              type="date"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={selectedDate}
              onChange={(event) => {
                const nextDate = event.target.value;
                setSelectedDate(nextDate);
                if (selectedProviderId) {
                  fetchSlots(selectedProviderId, nextDate);
                }
              }}
            />
            <button
              type="button"
              className="rounded-full border border-slate-200 px-4 py-2 text-xs"
              onClick={() => {
                if (selectedProviderId) {
                  fetchSlots(selectedProviderId, selectedDate);
                }
              }}
            >
              Refresh slots
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {slots.map((slot) => (
              <button
                key={slot.startTime}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                className={`rounded-2xl border p-4 text-left transition ${selectedSlot?.startTime === slot.startTime ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}
              >
                <p className="text-sm font-semibold text-slate-900">
                  {new Date(slot.startTime).toLocaleTimeString()} - {new Date(slot.endTime).toLocaleTimeString()}
                </p>
              </button>
            ))}
            {slots.length === 0 && (
              <p className="text-sm text-slate-500">No available slots for this date.</p>
            )}
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-slate-500">
            Service: {selectedService?.name ?? "-"} - Provider: {selectedProvider?.name ?? "-"}
          </p>
          <p className="text-sm text-slate-500">
            Time: {selectedSlot ? new Date(selectedSlot.startTime).toLocaleString() : "-"}
          </p>
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
