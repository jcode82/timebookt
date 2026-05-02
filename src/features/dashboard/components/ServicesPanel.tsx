"use client";

import React, { useEffect, useState, useTransition, type FormEvent } from "react";
import type { ZodError } from "zod";
import type { ServiceRecord } from "@/domain/services/types";
import {
  createDashboardServiceAction,
  setDashboardServiceActiveStateAction,
  updateDashboardServiceAction,
} from "@/features/dashboard/api/serviceActions";
import { formatPriceCents } from "@/features/dashboard/utils/formatters";
import type {
  CreateDashboardServiceInput,
  ServiceFormValues,
  UpdateDashboardServiceInput,
} from "@/features/dashboard/utils/serviceManagementSchema";
import {
  createDashboardServiceSchema,
  updateDashboardServiceSchema,
} from "@/features/dashboard/utils/serviceManagementSchema";

interface ServicesPanelProps {
  businessId: string;
  businessSlug: string;
  services: ServiceRecord[];
}

type ServiceFieldErrors = Partial<Record<keyof ServiceFormValues, string>>;

const emptyForm = (): ServiceFormValues => ({
  name: "",
  durationMinutes: "60",
  price: "0.00",
});

function formatPriceInput(priceCents: number) {
  return (priceCents / 100).toFixed(2);
}

function toFormValues(service: ServiceRecord): ServiceFormValues {
  return {
    name: service.name,
    durationMinutes: String(service.durationMinutes),
    price: formatPriceInput(service.priceCents),
  };
}

function getFieldErrors(error: ZodError): ServiceFieldErrors {
  const flattened = error.flatten();

  return {
    name: flattened.fieldErrors.name?.[0],
    durationMinutes: flattened.fieldErrors.durationMinutes?.[0],
    price: flattened.fieldErrors.price?.[0],
  };
}

export function ServicesPanel({ businessId, businessSlug, services: initialServices }: ServicesPanelProps) {
  const [pending, startTransition] = useTransition();
  const [services, setServices] = useState(initialServices);
  const [serviceForm, setServiceForm] = useState<ServiceFormValues>(emptyForm);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ServiceFieldErrors>({});

  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  const resetForm = () => {
    setServiceForm(emptyForm());
    setEditingServiceId(null);
    setFieldErrors({});
  };

  const handleFieldChange = (field: keyof ServiceFormValues, value: string) => {
    setServiceForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
    setMessage(null);
  };

  const handleCreate = (payload: CreateDashboardServiceInput) => {
    const result = createDashboardServiceSchema.safeParse(payload);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      setMessage(result.error.issues[0]?.message ?? "Please review the service details");
      return;
    }

    startTransition(async () => {
      const result = await createDashboardServiceAction(payload);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setServices((prev) => [...prev, result.service]);
      resetForm();
      setMessage("Service created.");
    });
  };

  const handleUpdate = (payload: UpdateDashboardServiceInput) => {
    const result = updateDashboardServiceSchema.safeParse(payload);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      setMessage(result.error.issues[0]?.message ?? "Please review the service details");
      return;
    }

    startTransition(async () => {
      const actionResult = await updateDashboardServiceAction(payload);
      if (!actionResult.ok) {
        setMessage(actionResult.message);
        return;
      }

      setServices((prev) =>
        prev.map((service) => (service.id === actionResult.service.id ? actionResult.service : service)),
      );
      resetForm();
      setMessage("Service updated.");
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});

    if (editingServiceId) {
      handleUpdate({
        serviceId: editingServiceId,
        businessId,
        businessSlug,
        ...serviceForm,
      });
      return;
    }

    handleCreate({
      businessId,
      businessSlug,
      ...serviceForm,
    });
  };

  const selectForEdit = (service: ServiceRecord) => {
    setEditingServiceId(service.id);
    setServiceForm(toFormValues(service));
    setFieldErrors({});
    setMessage(null);
  };

  const setServiceActiveState = (serviceId: string, isActive: boolean) => {
    startTransition(async () => {
      const result = await setDashboardServiceActiveStateAction({
        serviceId,
        businessId,
        businessSlug,
        isActive,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setServices((prev) =>
        prev.map((service) => (service.id === result.service.id ? result.service : service)),
      );
      if (editingServiceId === serviceId && !isActive) {
        resetForm();
      }
      setMessage(isActive ? "Service restored." : "Service deactivated.");
    });
  };

  const activeServices = services.filter((service) => service.isActive).length;

  return (
    <section id="services" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Services</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Service catalog</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create, edit, and retire bookable services for this business.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Active services</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{activeServices}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                {editingServiceId ? "Edit service" : "Create service"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {editingServiceId
                  ? "Update pricing and duration without leaving the dashboard."
                  : "Add a clean, bookable service with a clear price and duration."}
              </p>
            </div>
            {editingServiceId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Name</span>
              <input
                value={serviceForm.name}
                onChange={(event) => handleFieldChange("name", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                placeholder="Initial consultation"
                disabled={pending}
              />
              {fieldErrors.name && <p className="mt-2 text-xs text-rose-600">{fieldErrors.name}</p>}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Duration (minutes)</span>
                <input
                  value={serviceForm.durationMinutes}
                  onChange={(event) => handleFieldChange("durationMinutes", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                  inputMode="numeric"
                  placeholder="60"
                  disabled={pending}
                />
                {fieldErrors.durationMinutes && (
                  <p className="mt-2 text-xs text-rose-600">{fieldErrors.durationMinutes}</p>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Price (USD)</span>
                <input
                  value={serviceForm.price}
                  onChange={(event) => handleFieldChange("price", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
                  inputMode="decimal"
                  placeholder="125.00"
                  disabled={pending}
                />
                {fieldErrors.price && <p className="mt-2 text-xs text-rose-600">{fieldErrors.price}</p>}
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-400">Changes refresh the dashboard data cache after save.</p>
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Saving..." : editingServiceId ? "Save changes" : "Create service"}
            </button>
          </div>

          {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
        </form>

        <div>
          <ul className="space-y-3">
            {services.map((service) => (
              <li key={service.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-950">{service.name}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          service.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {service.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{service.durationMinutes} minutes</p>
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    {formatPriceCents(service.priceCents, service.currency)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => selectForEdit(service)}
                    className="font-medium text-slate-700 transition hover:text-slate-950"
                    disabled={pending}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceActiveState(service.id, !service.isActive)}
                    className={`font-medium transition ${
                      service.isActive
                        ? "text-rose-600 hover:text-rose-700"
                        : "text-emerald-700 hover:text-emerald-800"
                    }`}
                    disabled={pending}
                  >
                    {service.isActive ? "Deactivate" : "Restore"}
                  </button>
                </div>
              </li>
            ))}
            {services.length === 0 && (
              <li className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No services are configured yet.
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
