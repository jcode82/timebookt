"use server";

import { env } from "@/lib/env";
import { listBusinessesByRegion } from "@/domain/businesses";

export interface HeroMetricsResult {
  region: string;
  businessCount: number;
}

export async function getHeroMetrics(): Promise<HeroMetricsResult> {
  try {
    const businesses = await listBusinessesByRegion(env.defaultRegion);
    return {
      region: env.defaultRegion,
      businessCount: businesses.length,
    };
  } catch {
    return {
      region: env.defaultRegion,
      businessCount: 0,
    };
  }
}
