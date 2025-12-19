import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

type RpcArgs = Record<string, unknown> | undefined;
type RpcBridge = {
  rpc(fn: string, args?: RpcArgs): Promise<{ data: unknown; error: PostgrestError | null }>;
};

export async function rpcCall<T>(
  client: SupabaseClient,
  fn: string,
  args?: RpcArgs,
): Promise<{ data: T | null; error: PostgrestError | null }> {
  const { data, error } = await (client as unknown as RpcBridge).rpc(fn, args);
  return { data: data as T | null, error };
}
