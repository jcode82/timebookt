"use server";

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { rpcCall } from "@/lib/supabase/rpc";

const waitlistSchema = z.object({
  email: z.string().email(),
});

export async function joinWaitlistAction(rawEmail: string) {
  const parsed = waitlistSchema.safeParse({ email: rawEmail });
  if (!parsed.success) {
    throw new Error("Please enter a valid email address.");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await rpcCall(supabase, "create_waitlist_entry", { email: parsed.data.email });

  if (error) {
    if (error.code === "23505") {
      throw new Error("You're already on the waitlist!");
    }
    throw new Error("Something went wrong. Please try again.");
  }

  return { ok: true };
}
