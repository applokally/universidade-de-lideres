import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function getPublicOrigin(req: Request) {
  const h = new Headers(req.headers);
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || new URL(req.url).host;
  return `${proto}://${host}`;
}

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();

  const origin = getPublicOrigin(req);
  return NextResponse.redirect(new URL("/login", origin));
}
