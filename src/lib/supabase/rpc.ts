import type { SupabaseClient } from "@supabase/supabase-js";

type RpcArgs = Record<string, unknown> | undefined;

type RpcClient = {
  rpc: (
    fn: string,
    args?: RpcArgs
  ) => Promise<{ data: unknown | null; error: unknown }>;
};

export function rpcCall<T>(
  client: SupabaseClient,
  fn: string,
  args?: RpcArgs,
): Promise<{ data: T | null; error: unknown }> {
  const rpcClient = client as unknown as RpcClient;
  return rpcClient.rpc(fn, args) as Promise<{ data: T | null; error: unknown }>;
}
