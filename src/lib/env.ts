import { DEFAULT_REGION } from "@/lib/constants";

export interface RuntimeEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
  defaultRegion: string;
}

function ensure(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const env: RuntimeEnv = {
  supabaseUrl: ensure(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: ensure(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  defaultRegion: process.env.NEXT_PUBLIC_TIMEBOOKT_REGION ?? DEFAULT_REGION,
};
