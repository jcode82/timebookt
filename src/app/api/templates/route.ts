import { NextResponse } from "next/server";
import { createTemplate, listTemplates } from "@/domain/templates";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }
  try {
    const templates = await listTemplates(businessId);
    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load templates";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const template = await createTemplate(payload);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create template";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
