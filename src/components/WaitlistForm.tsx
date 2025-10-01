"use client"; // Needed since it handles form submission

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("waitlist").insert([{ email }] as any);

    if (error) {
      // Supabase will send a Postgres error when UNIQUE constraint is violated
      if (error.code === "23505" || error.message.includes("duplicate key value")) {
        // 23505 = unique_violation
        setMessage("You're already on the waitlist!");
      }
      setMessage("Something went wrong. Please try again.");
    } else {
      setMessage("🎉 Thanks for joining the beta!");
      setEmail("");
    }

    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3 w-full max-w-md"
    >
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="flex-1 rounded-xl px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-[#3BAFDA] focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-[#3DDC97] hover:bg-[#3BAFDA] text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md disabled:opacity-50"
      >
        {loading ? "Joining..." : "Join the Beta"}
      </button>
      {message && <p className="text-sm text-gray-600 mt-2">{message}</p>}
    </form>
  );
}
