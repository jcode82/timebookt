"use client";

import { useState, useTransition } from "react";
import { joinWaitlistAction } from "@/features/home/api/joinWaitlistAction";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      setMessage(null);
      try {
        await joinWaitlistAction(email);
        setEmail("");
        setMessage("🎉 Thanks for joining the beta!");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          placeholder="you@business.com"
          className="w-full flex-1 rounded-full border border-white/20 bg-transparent px-5 py-3 text-sm placeholder:text-slate-400 focus:border-white/60 focus:outline-none"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition disabled:opacity-60"
        >
          {pending ? "Joining..." : "Join the waitlist"}
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-slate-300">{message}</p>}
    </form>
  );
}
