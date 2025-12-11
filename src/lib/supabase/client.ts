import { cache } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../supabase/types";
import { env } from "@/lib/env";

let adminSingleton: SupabaseClient<Database> | null = null;
let anonSingleton: SupabaseClient<Database> | null = null;

const buildClient = (
  key: string,
  { persistSession } = { persistSession: false },
): SupabaseClient<Database> =>
  createClient<Database>(env.supabaseUrl, key, {
    auth: {
      persistSession,
      detectSessionInUrl: false,
    },
  });

export const getSupabaseAdmin = cache(() => {
  if (!env.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server actions");
  }
  if (!adminSingleton) {
    adminSingleton = buildClient(env.supabaseServiceRoleKey);
  }
  return adminSingleton;
});

export const getSupabaseBrowserClient = () => {
  if (!anonSingleton) {
    anonSingleton = buildClient(env.supabaseAnonKey, { persistSession: true });
  }
  return anonSingleton;
};
