import { NextResponse } from "next/server";
import { createTemplate, listTemplates } from "@/domain/templates";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }
  const templates = await listTemplates(businessId);
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const template = await createTemplate(payload);
  return NextResponse.json(template, { status: 201 });
}
