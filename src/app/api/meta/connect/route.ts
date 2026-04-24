import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { getPrimaryTenant } from "@/lib/tenant";

/**
 * Starts a Meta connection flow.
 * Issues a one-time `state` and redirects the user to the Make.com connection URL.
 * The Make scenario must read `state` and `tenant_id` from the query string,
 * perform Facebook OAuth, then POST the result to /api/meta/callback.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getPrimaryTenant(userId);
  if (!tenant) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const connectUrl = process.env.MAKE_WEBHOOK_META_CONNECT;
  if (!connectUrl) {
    return NextResponse.json(
      { error: "MAKE_WEBHOOK_META_CONNECT is not configured" },
      { status: 500 },
    );
  }

  const state = randomBytes(24).toString("hex");
  // TODO: persist state short-term (Redis or a table) to validate in callback.

  const url = new URL(connectUrl);
  url.searchParams.set("state", state);
  url.searchParams.set("tenant_id", tenant.id);
  url.searchParams.set("return_to", `${process.env.APP_BASE_URL}/connections?connected=1`);

  return NextResponse.redirect(url.toString());
}
