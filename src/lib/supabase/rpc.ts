import type { SupabaseClient } from "@supabase/supabase-js";

type RpcArgs = Record<string, unknown> | undefined;

export function rpcCall<T>(
  client: SupabaseClient,
  fn: string,
  args?: RpcArgs,
): Promise<{ data: T | null; error: unknown }> {
  return (client as any).rpc(fn, args);
}
