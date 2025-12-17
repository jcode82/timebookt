"use client";

import { useState, useTransition, type FormEvent } from "react";
import { businessOnboardingSchema } from "@/features/onboarding/utils/schema";
import type { BusinessOnboardingForm } from "@/features/onboarding/utils/schema";
import { createBusinessAction } from "@/features/onboarding/api/createBusinessAction";

const initialState: BusinessOnboardingForm = {
  name: "",
  regionCode: process.env.NEXT_PUBLIC_TIMEBOOKT_REGION ?? "",
  timezone: "America/New_York",
  contactEmail: "",
  contactPhone: "",
  description: "",
};

export function BusinessSignupForm() {
  const [formData, setFormData] = useState<BusinessOnboardingForm>(initialState);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleChange = (field: keyof BusinessOnboardingForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setMessage(null);
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = businessOnboardingSchema.safeParse(formData);

    if (!result.success) {
      setMessage(result.error.issues[0]?.message ?? "Please review the form");
      return;
    }

    startTransition(async () => {
      try {
        await createBusinessAction(result.data);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Unable to create business";
        setMessage(messageText);
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="text-sm font-medium text-slate-700">Business name</label>
        <input
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
          value={formData.name}
          onChange={handleChange("name")}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Region code</label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
            value={formData.regionCode}
            onChange={handleChange("regionCode")}
            placeholder="nyc"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Timezone</label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
            value={formData.timezone}
            onChange={handleChange("timezone")}
            required
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Contact email</label>
        <input
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
          type="email"
          value={formData.contactEmail}
          onChange={handleChange("contactEmail")}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Contact phone</label>
        <input
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
          value={formData.contactPhone ?? ""}
          onChange={handleChange("contactPhone")}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Description</label>
        <textarea
          className="mt-1 min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-2"
          value={formData.description ?? ""}
          onChange={handleChange("description")}
        />
      </div>
      <button
        type="submit"
        className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-700"
        disabled={pending}
      >
        {pending ? "Creating..." : "Create business"}
      </button>
      {message && <p className="text-sm text-rose-600">{message}</p>}
    </form>
  );
}
