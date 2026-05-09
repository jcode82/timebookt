import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../supabase/types";
import { getBusinessBySlug, isBusinessOwnedByUser } from "@/domain/businesses";
import { env } from "@/lib/env";

const AUTH_COOKIE_MARKER = "auth-token";

export const UNAUTHORIZED_REDIRECT_PATH = "/";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string | null;
}

const supabaseAuthClient = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: false,
    detectSessionInUrl: false,
  },
});

function getCookieBaseName(name: string) {
  return name.replace(/\.\d+$/, "");
}

function getCookieChunkIndex(name: string) {
  const match = name.match(/\.(\d+)$/);
  return match ? Number(match[1]) : -1;
}

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractAccessTokenFromValue(value: string): string | null {
  const decoded = decodeCookieValue(value).replace(/^"|"$/g, "");

  try {
    const parsed = JSON.parse(decoded) as
      | { access_token?: unknown }
      | [unknown, ...unknown[]]
      | null;

    if (Array.isArray(parsed)) {
      return typeof parsed[0] === "string" && parsed[0].length > 0 ? parsed[0] : null;
    }

    if (parsed && typeof parsed === "object" && typeof parsed.access_token === "string") {
      return parsed.access_token;
    }
  } catch {
    return null;
  }

  return null;
}

function extractAccessTokenFromCookies() {
  const authCookies = cookies()
    .getAll()
    .filter((cookie) => cookie.name.includes(AUTH_COOKIE_MARKER));

  const groupedCookies = new Map<string, Array<{ name: string; value: string }>>();

  for (const cookie of authCookies) {
    const baseName = getCookieBaseName(cookie.name);
    const group = groupedCookies.get(baseName) ?? [];
    group.push(cookie);
    groupedCookies.set(baseName, group);
  }

  for (const group of groupedCookies.values()) {
    const value = group
      .sort((left, right) => getCookieChunkIndex(left.name) - getCookieChunkIndex(right.name))
      .map((cookie) => cookie.value)
      .join("");
    const accessToken = extractAccessTokenFromValue(value);

    if (accessToken) {
      return accessToken;
    }
  }

  return null;
}

function getUserFullName(
  user: Awaited<ReturnType<typeof supabaseAuthClient.auth.getUser>>["data"]["user"],
): string | null {
  const metadata = user?.user_metadata;

  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const candidates = [metadata.full_name, metadata.name, metadata.display_name];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const accessToken = extractAccessTokenFromCookies();
  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    fullName: getUserFullName(data.user),
  };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}

export async function requireBusinessOwnerAccess(businessId: string): Promise<SessionUser> {
  const user = await requireSessionUser();
  const isOwner = await isBusinessOwnedByUser({
    businessId,
    userId: user.id,
  });

  if (!isOwner) {
    throw new UnauthorizedError();
  }

  return user;
}

export async function getOwnedBusinessBySlug(slug: string) {
  const user = await requireSessionUser();
  const business = await getBusinessBySlug(slug);

  if (!business) {
    return null;
  }

  const isOwner = await isBusinessOwnedByUser({
    businessId: business.id,
    userId: user.id,
  });

  if (!isOwner) {
    throw new UnauthorizedError();
  }

  return business;
}
