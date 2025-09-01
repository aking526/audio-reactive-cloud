import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const user = data?.claims;

    return NextResponse.json({
      authenticated: !!user
    });
  } catch {
    return NextResponse.json({
      authenticated: false,
      error: "Failed to check authentication"
    }, { status: 500 });
  }
}
