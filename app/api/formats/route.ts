import { NextResponse } from "next/server";
import { readFormats } from "@/app/lib/format-store";
import { getSessionUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/formats — list saved post formats (newest first). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const formats = await readFormats();
  return NextResponse.json({ formats });
}
