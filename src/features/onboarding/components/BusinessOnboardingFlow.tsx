"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AvailabilityBlock } from "@/domain/appointments";
import type { ServiceRecord } from "@/domain/services";
import {
  completeOnboardingAction,
  createOnboardingAvailabilityAction,
  createOnboardingBusinessAction,
  createOnboardingServiceAction,
} from "@/features/onboarding/api/actions";
import {
  availabilityBlockSchema,
  businessProfileSchema,
  serviceSchema,
  type AvailabilityBlockForm,
  type BusinessOnboardingForm,
  type OnboardingServiceForm,
} from "@/features/onboarding/utils/schema";

const STORAGE_KEY = "timebookt:onboarding:draft:v1";

const STEP_ORDER = ["business", "services", "availability", "review"] as const;
type OnboardingStep = (typeof STEP_ORDER)[number];

type BusinessSummary = {
  id: string;
  slug: string;
  name: string;
};

interface OnboardingDraft {
  currentStep: OnboardingStep;
  businessForm: BusinessOnboardingForm;
  business?: BusinessSummary;
  services: ServiceRecord[];
  availabilityBlocks: AvailabilityBlock[];
}

const weekdayOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const emptyServiceForm = (): OnboardingServiceForm => ({
  businessId: "",
  name: "",
  description: "",
  durationMinutes: 60,
  priceCents: 0,
  currency: "USD",
});

const emptyAvailabilityForm = (): AvailabilityBlockForm => ({
  businessId: "",
  dayOfWeek: 1,
  startTime: "09:00:00",
  endTime: "17:00:00",
  capacity: 1,
});

const buildInitialDraft = (
  regionCode: string,
  timezone: string,
): OnboardingDraft => ({
  currentStep: "business",
  businessForm: {
    name: "",
    slug: "",
    regionCode,
    timezone,
    contactEmail: "",
    contactPhone: "",
    description: "",
  },
  services: [],
  availabilityBlocks: [],
});

const parseStoredDraft = (
  value: string | null,
  regionCode: string,
  timezone: string,
): OnboardingDraft => {
  if (!value) {
    return buildInitialDraft(regionCode, timezone);
  }

  try {
    const parsed = JSON.parse(value) as Partial<OnboardingDraft>;
    return {
      ...buildInitialDraft(regionCode, timezone),
      ...parsed,
      businessForm: {
        ...buildInitialDraft(regionCode, timezone).businessForm,
        ...parsed.businessForm,
        regionCode,
        timezone: parsed.businessForm?.timezone ?? timezone,
      },
      services: parsed.services ?? [],
      availabilityBlocks: parsed.availabilityBlocks ?? [],
    };
  } catch {
    return buildInitialDraft(regionCode, timezone);
  }
};

const formatPrice = (priceCents: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
}).format(priceCents / 100);

const getStepIndex = (step: OnboardingStep) => STEP_ORDER.indexOf(step);

export function BusinessOnboardingFlow({
  regionCode,
  timezone,
}: {
  regionCode: string;
  timezone: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<OnboardingDraft>(() => buildInitialDraft(regionCode, timezone));
  const [serviceForm, setServiceForm] = useState<OnboardingServiceForm>(emptyServiceForm);
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityBlockForm>(emptyAvailabilityForm);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = parseStoredDraft(window.localStorage.getItem(STORAGE_KEY), regionCode, timezone);
    setDraft(stored);
    if (stored.business) {
      setServiceForm((prev) => ({ ...prev, businessId: stored.business?.id ?? prev.businessId }));
      setAvailabilityForm((prev) => ({
        ...prev,
        businessId: stored.business?.id ?? prev.businessId,
      }));
    }
  }, [regionCode, timezone]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  const currentStepIndex = getStepIndex(draft.currentStep);
  const canFinish = Boolean(draft.business) && draft.services.length > 0 && draft.availabilityBlocks.length > 0;

  const stepSummaries = useMemo(
    () => [
      {
        id: "business",
        title: "Business profile",
        description: draft.business
          ? `${draft.business.name} is created and locked in`
          : "Name, slug, region, and contact details",
      },
      {
        id: "services",
        title: "Services",
        description:
          draft.services.length > 0
            ? `${draft.services.length} service${draft.services.length === 1 ? "" : "s"} added`
            : "Add at least one bookable service",
      },
      {
        id: "availability",
        title: "Availability",
        description:
          draft.availabilityBlocks.length > 0
            ? `${draft.availabilityBlocks.length} availability block${draft.availabilityBlocks.length === 1 ? "" : "s"} added`
            : "Add at least one opening block",
      },
      {
        id: "review",
        title: "Review",
        description: "Verify minimum requirements and launch the dashboard",
      },
    ] satisfies Array<{ id: OnboardingStep; title: string; description: string }>,
    [draft.availabilityBlocks.length, draft.business, draft.services.length],
  );

  const updateBusinessForm = (field: keyof BusinessOnboardingForm, value: string) => {
    setMessage(null);
    setDraft((prev) => ({
      ...prev,
      businessForm: {
        ...prev.businessForm,
        [field]: value,
      },
    }));
  };

  const handleBusinessSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = businessProfileSchema.safeParse(draft.businessForm);
    if (!result.success) {
      setMessage(result.error.issues[0]?.message ?? "Please review the business profile");
      return;
    }

    startTransition(async () => {
      try {
        const business = await createOnboardingBusinessAction(result.data);
        setDraft((prev) => ({
          ...prev,
          business,
          currentStep: "services",
        }));
        setServiceForm((prev) => ({ ...prev, businessId: business.id }));
        setAvailabilityForm((prev) => ({ ...prev, businessId: business.id }));
        setMessage(null);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to create business");
      }
    });
  };

  const handleServiceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.business) {
      setMessage("Create the business profile first");
      return;
    }

    const result = serviceSchema.safeParse({
      ...serviceForm,
      businessId: draft.business.id,
    });
    if (!result.success) {
      setMessage(result.error.issues[0]?.message ?? "Please review the service details");
      return;
    }

    startTransition(async () => {
      try {
        const service = await createOnboardingServiceAction(result.data);
        setDraft((prev) => ({
          ...prev,
          services: [...prev.services, service],
        }));
        setServiceForm((prev) => ({
          ...emptyServiceForm(),
          businessId: prev.businessId,
          currency: prev.currency,
        }));
        setMessage(null);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to create service");
      }
    });
  };

  const handleAvailabilitySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.business) {
      setMessage("Create the business profile first");
      return;
    }

    const result = availabilityBlockSchema.safeParse({
      ...availabilityForm,
      businessId: draft.business.id,
    });
    if (!result.success) {
      setMessage(result.error.issues[0]?.message ?? "Please review the availability block");
      return;
    }

    startTransition(async () => {
      try {
        const [block] = await createOnboardingAvailabilityAction({ blocks: [result.data] });
        setDraft((prev) => ({
          ...prev,
          availabilityBlocks: block ? [...prev.availabilityBlocks, block] : prev.availabilityBlocks,
        }));
        setAvailabilityForm((prev) => ({
          ...emptyAvailabilityForm(),
          businessId: prev.businessId,
        }));
        setMessage(null);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to create availability");
      }
    });
  };

  const completeOnboarding = () => {
    const business = draft.business;
    if (!business) {
      setMessage("Create the business profile first");
      return;
    }
    if (!canFinish) {
      setMessage("Add at least one service and one availability block before finishing");
      return;
    }

    startTransition(async () => {
      try {
        const result = await completeOnboardingAction({
          businessId: business.id,
          slug: business.slug,
        });
        window.localStorage.removeItem(STORAGE_KEY);
        router.push(`/dashboard/${result.slug}`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to complete onboarding");
      }
    });
  };

  const goToStep = (step: OnboardingStep) => {
    const requestedIndex = getStepIndex(step);
    const maxUnlockedIndex = draft.business
      ? draft.services.length > 0
        ? draft.availabilityBlocks.length > 0
          ? 3
          : 2
        : 1
      : 0;

    if (requestedIndex <= maxUnlockedIndex) {
      setDraft((prev) => ({ ...prev, currentStep: step }));
      setMessage(null);
    }
  };

  const advance = () => {
    if (draft.currentStep === "business" && draft.business) {
      goToStep("services");
      return;
    }
    if (draft.currentStep === "services" && draft.services.length > 0) {
      goToStep("availability");
      return;
    }
    if (draft.currentStep === "availability" && draft.availabilityBlocks.length > 0) {
      goToStep("review");
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <ol className="space-y-3">
          {stepSummaries.map((step, index) => {
            const isActive = draft.currentStep === step.id;
            const isComplete = index < currentStepIndex || (
              step.id === "business" && Boolean(draft.business)
            ) || (
              step.id === "services" && draft.services.length > 0
            ) || (
              step.id === "availability" && draft.availabilityBlocks.length > 0
            );

            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => goToStep(step.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                    isActive ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    isActive ? "bg-white text-slate-900" : isComplete ? "bg-emerald-600 text-white" : "bg-white text-slate-500"
                  }`}>
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{step.title}</span>
                    <span className={`mt-1 block text-xs ${isActive ? "text-slate-200" : "text-slate-500"}`}>
                      {step.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {draft.currentStep === "business" ? (
          <form onSubmit={handleBusinessSubmit} className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Create the business</h2>
              <p className="mt-2 text-sm text-slate-600">
                This step creates the business record and locks the onboarding to the configured region.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Business name
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                  value={draft.businessForm.name}
                  onChange={(event) => updateBusinessForm("name", event.target.value)}
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Slug
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                  value={draft.businessForm.slug}
                  onChange={(event) => updateBusinessForm("slug", event.target.value)}
                  placeholder="studio-north"
                  required
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Region
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
                  value={draft.businessForm.regionCode}
                  readOnly
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Timezone
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                  value={draft.businessForm.timezone}
                  onChange={(event) => updateBusinessForm("timezone", event.target.value)}
                  required
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Contact email
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                  type="email"
                  value={draft.businessForm.contactEmail}
                  onChange={(event) => updateBusinessForm("contactEmail", event.target.value)}
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Contact phone
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                  value={draft.businessForm.contactPhone ?? ""}
                  onChange={(event) => updateBusinessForm("contactPhone", event.target.value)}
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Description
              <textarea
                className="mt-1 min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3"
                value={draft.businessForm.description ?? ""}
                onChange={(event) => updateBusinessForm("description", event.target.value)}
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Optional fields can be refined later in the dashboard.</p>
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {pending ? "Creating..." : "Save and continue"}
              </button>
            </div>
          </form>
        ) : null}

        {draft.currentStep === "services" ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Add a first service</h2>
              <p className="mt-2 text-sm text-slate-600">
                At least one active service is required before the business can go live.
              </p>
            </div>
            <form onSubmit={handleServiceSubmit} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Service name
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                  value={serviceForm.name}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Description
                <textarea
                  className="mt-1 min-h-[100px] w-full rounded-2xl border border-slate-200 px-4 py-3"
                  value={serviceForm.description ?? ""}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Duration minutes
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                  type="number"
                  min="5"
                  step="5"
                  value={serviceForm.durationMinutes}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))}
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Price in cents
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                  type="number"
                  min="0"
                  step="100"
                  value={serviceForm.priceCents}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, priceCents: Number(event.target.value) }))}
                  required
                />
              </label>
              <div className="sm:col-span-2 flex items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {pending ? "Saving..." : "Add service"}
                </button>
                <button
                  type="button"
                  onClick={advance}
                  disabled={draft.services.length < 1 || pending}
                  className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Continue to availability
                </button>
              </div>
            </form>
            <ul className="space-y-3 rounded-2xl bg-slate-50 p-4">
              {draft.services.length === 0 ? (
                <li className="text-sm text-slate-500">No services added yet.</li>
              ) : (
                draft.services.map((service) => (
                  <li key={service.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-900">{service.name}</span>
                      <span className="text-sm text-slate-500">
                        {service.durationMinutes} min · {formatPrice(service.priceCents)}
                      </span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}

        {draft.currentStep === "availability" ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Set initial availability</h2>
              <p className="mt-2 text-sm text-slate-600">
                Add at least one recurring block so the business can accept bookings.
              </p>
            </div>
            <form onSubmit={handleAvailabilitySubmit} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Day of week
                <select
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                  value={availabilityForm.dayOfWeek}
                  onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, dayOfWeek: Number(event.target.value) }))}
                >
                  {weekdayOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Capacity
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                  type="number"
                  min="1"
                  value={availabilityForm.capacity}
                  onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, capacity: Number(event.target.value) }))}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Start time
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                  type="time"
                  step="60"
                  value={availabilityForm.startTime.slice(0, 5)}
                  onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, startTime: `${event.target.value}:00` }))}
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                End time
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                  type="time"
                  step="60"
                  value={availabilityForm.endTime.slice(0, 5)}
                  onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, endTime: `${event.target.value}:00` }))}
                  required
                />
              </label>
              <div className="sm:col-span-2 flex items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {pending ? "Saving..." : "Add availability"}
                </button>
                <button
                  type="button"
                  onClick={advance}
                  disabled={draft.availabilityBlocks.length < 1 || pending}
                  className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Review and finish
                </button>
              </div>
            </form>
            <ul className="space-y-3 rounded-2xl bg-slate-50 p-4">
              {draft.availabilityBlocks.length === 0 ? (
                <li className="text-sm text-slate-500">No availability blocks added yet.</li>
              ) : (
                draft.availabilityBlocks.map((block) => (
                  <li key={block.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    {weekdayOptions.find((option) => option.value === block.dayOfWeek)?.label ?? "Unknown"} · {block.startTime.slice(0, 5)} - {block.endTime.slice(0, 5)} · Capacity {block.capacity}
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}

        {draft.currentStep === "review" ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Review and launch</h2>
              <p className="mt-2 text-sm text-slate-600">
                Completion will persist the onboarding flag and send you straight to the business dashboard.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-900">Business</h3>
                <p className="mt-2 text-sm text-slate-600">{draft.business?.name ?? "Not created"}</p>
                <p className="mt-1 text-xs text-slate-500">/{draft.business?.slug ?? "pending"}</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-900">Services</h3>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{draft.services.length}</p>
                <p className="mt-1 text-xs text-slate-500">Minimum: 1</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-900">Availability</h3>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{draft.availabilityBlocks.length}</p>
                <p className="mt-1 text-xs text-slate-500">Minimum: 1</p>
              </article>
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => goToStep("availability")}
                className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Back to availability
              </button>
              <button
                type="button"
                onClick={completeOnboarding}
                disabled={!canFinish || pending}
                className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {pending ? "Finishing..." : "Complete onboarding"}
              </button>
            </div>
          </div>
        ) : null}

        {message ? <p className="mt-5 text-sm text-rose-600">{message}</p> : null}
      </div>
    </section>
  );
}
