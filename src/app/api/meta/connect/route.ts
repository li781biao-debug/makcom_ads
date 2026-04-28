import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPrimaryTenant } from "@/lib/tenant";

const STATE_TTL_MS = 15 * 60 * 1000;

/**
 * Starts a Meta connection flow.
 * Issues a one-time `state` (persisted in OAuthState) and redirects the user to
 * the Make.com connection URL. The Make scenario reads `state` and `tenant_id`
 * from the query string, performs Facebook OAuth, then POSTs to /api/meta/callback
 * which validates state before persisting the connection.
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
  await prisma.oAuthState.create({
    data: {
      state,
      tenantId: tenant.id,
      userId,
      purpose: "meta_connect",
      expiresAt: new Date(Date.now() + STATE_TTL_MS),
    },
  });

  const url = new URL(connectUrl);
  url.searchParams.set("state", state);
  url.searchParams.set("tenant_id", tenant.id);
  url.searchParams.set("return_to", `${process.env.APP_BASE_URL}/connections/popup-done`);

  return NextResponse.redirect(url.toString());
}
