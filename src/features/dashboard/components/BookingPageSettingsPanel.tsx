"use client";

import React from "react";
import { useEffect, useState, useTransition } from "react";
import type { BusinessSettings } from "@/domain/businesses";
import type { ServiceRecord } from "@/domain/services/types";
import { updateDashboardBusinessSettingsAction } from "@/features/dashboard/api/businessSettingsActions";

interface BookingPageSettingsPanelProps {
  businessId: string;
  businessSlug: string;
  settings: BusinessSettings;
  services: ServiceRecord[];
}

type ServiceVisibility = BusinessSettings["publicBookingPage"]["serviceVisibility"];

export function BookingPageSettingsPanel({
  businessId,
  businessSlug,
  settings,
  services,
}: BookingPageSettingsPanelProps) {
  const [pending, startTransition] = useTransition();
  const [showBusinessName, setShowBusinessName] = useState(settings.publicBookingPage.showBusinessName);
  const [serviceVisibility, setServiceVisibility] = useState<ServiceVisibility>(
    settings.publicBookingPage.serviceVisibility,
  );
  const [visibleServiceIds, setVisibleServiceIds] = useState(settings.publicBookingPage.visibleServiceIds);
  const [message, setMessage] = useState<string | null>(null);

  const activeServices = services.filter((service) => service.isActive);

  useEffect(() => {
    setShowBusinessName(settings.publicBookingPage.showBusinessName);
    setServiceVisibility(settings.publicBookingPage.serviceVisibility);
    setVisibleServiceIds(settings.publicBookingPage.visibleServiceIds);
  }, [settings]);

  const toggleService = (serviceId: string) => {
    setVisibleServiceIds((current) =>
      current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId],
    );
    setMessage(null);
  };

  const handleSave = () => {
    setMessage(null);

    startTransition(async () => {
      const result = await updateDashboardBusinessSettingsAction({
        businessId,
        businessSlug,
        showBusinessName,
        serviceVisibility,
        visibleServiceIds,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setShowBusinessName(result.settings.publicBookingPage.showBusinessName);
      setServiceVisibility(result.settings.publicBookingPage.serviceVisibility);
      setVisibleServiceIds(result.settings.publicBookingPage.visibleServiceIds);
      setMessage("Booking page settings updated.");
    });
  };

  return (
    <section id="booking-page-settings" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Booking page</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Public booking page settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Control what customers see at <span className="font-medium text-slate-700">/{businessSlug}/book</span>.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300"
            checked={showBusinessName}
            onChange={(event) => {
              setShowBusinessName(event.target.checked);
              setMessage(null);
            }}
            disabled={pending}
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">Show business name</span>
            <span className="mt-1 block text-sm text-slate-500">
              Turn this off to use a more neutral public booking header.
            </span>
          </span>
        </label>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-sm font-medium text-slate-900">Services shown on the booking page</p>
          <p className="mt-1 text-sm text-slate-500">
            Choose whether the public page lists every active service or only a curated subset.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <input
                type="radio"
                name="serviceVisibility"
                checked={serviceVisibility === "all"}
                onChange={() => {
                  setServiceVisibility("all");
                  setMessage(null);
                }}
                disabled={pending}
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">Show all active services</span>
                <span className="mt-1 block text-sm text-slate-500">
                  New active services will appear automatically.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <input
                type="radio"
                name="serviceVisibility"
                checked={serviceVisibility === "selected"}
                onChange={() => {
                  setServiceVisibility("selected");
                  if (visibleServiceIds.length === 0) {
                    setVisibleServiceIds(activeServices.map((service) => service.id));
                  }
                  setMessage(null);
                }}
                disabled={pending || activeServices.length === 0}
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">Choose specific services</span>
                <span className="mt-1 block text-sm text-slate-500">
                  Keep the public menu focused on a selected set.
                </span>
              </span>
            </label>
          </div>

          {serviceVisibility === "selected" && (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
              {activeServices.length > 0 ? (
                <div className="space-y-3">
                  {activeServices.map((service) => (
                    <label key={service.id} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                      <span>{service.name}</span>
                      <input
                        type="checkbox"
                        checked={visibleServiceIds.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                        disabled={pending}
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Create an active service before curating the booking page.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-400">Saving also refreshes the public booking page immediately.</p>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save booking page settings"}
        </button>
      </div>

      {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
    </section>
  );
}
