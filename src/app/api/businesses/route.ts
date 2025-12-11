import { NextResponse } from "next/server";
import { createBusiness, listBusinessesByRegion } from "@/domain/businesses";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") ?? env.defaultRegion;
  const businesses = await listBusinessesByRegion(region);
  return NextResponse.json({ region, businesses });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const business = await createBusiness(payload);
  return NextResponse.json(business, { status: 201 });
}
