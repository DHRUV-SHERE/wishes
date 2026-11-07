import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";

const TYPES = ["opened", "viewed", "replied"] as const;

export async function POST(req: NextRequest) {
  let body: { slug?: unknown; type?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug.slice(0, 32) : "";
  const type = TYPES.find((t) => t === body.type);
  if (!slug || !type) return NextResponse.json({ ok: false }, { status: 400 });

  const ua = req.headers.get("user-agent") ?? "";
  // Vercel adds this header at the edge; undefined locally
  const country = req.headers.get("x-vercel-ip-country") ?? undefined;

  try {
    const res = await fetchMutation(api.wishes.track, { slug, type, ua, country });
    return NextResponse.json({ ok: true, counted: res.counted });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
