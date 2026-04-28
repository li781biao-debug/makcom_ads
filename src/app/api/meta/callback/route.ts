import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

/**
 * Inbound webhook from Make.com after a tenant connects their Meta account.
 * Make sends: the connection reference it assigned, the FB user info, and the list
 * of ad accounts that tenant has access to. We persist references only — no token.
 *
 * Authentication:
 *   - X-Make-Secret header must match MAKE_SHARED_SECRET
 *   - body.state must match a row in OAuthState (not used, not expired, same tenant)
 *
 * The state mark-used + connection insert + ad account upserts all run inside one
 * Prisma transaction so a partial failure leaves the state row reusable.
 */
const Body = z.object({
  state: z.string().min(1),
  tenant_id: z.string().min(1),
  make_connection_ref: z.string().min(1),
  fb_user_id: z.string().optional(),
  fb_user_name: z.string().optional(),
  ad_accounts: z.array(
    z.object({
      act_id: z.string(),
      name: z.string(),
      currency: z.string().optional(),
      timezone_name: z.string().optional(),
      account_status: z.number().optional(),
    }),
  ),
});

export async function POST(req: Request) {
  const secret = req.headers.get("x-make-secret");
  if (secret !== process.env.MAKE_SHARED_SECRET) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Bad secret" } }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_BODY", message: parsed.error.message } },
      { status: 400 },
    );
  }
  const b = parsed.data;

  const stateRow = await prisma.oAuthState.findUnique({ where: { state: b.state } });
  if (
    !stateRow ||
    stateRow.used ||
    stateRow.expiresAt < new Date() ||
    stateRow.tenantId !== b.tenant_id ||
    stateRow.purpose !== "meta_connect"
  ) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_STATE", message: "state invalid, expired, or already used" } },
      { status: 401 },
    );
  }

  const connection = await prisma.$transaction(async (tx) => {
    await tx.oAuthState.update({
      where: { state: b.state },
      data: { used: true },
    });

    const conn = await tx.metaConnection.create({
      data: {
        tenantId: b.tenant_id,
        makeConnectionRef: b.make_connection_ref,
        fbUserId: b.fb_user_id,
        fbUserName: b.fb_user_name,
      },
    });

    for (const a of b.ad_accounts) {
      await tx.adAccount.upsert({
        where: { tenantId_actId: { tenantId: b.tenant_id, actId: a.act_id } },
        update: {
          name: a.name,
          currency: a.currency,
          timezoneName: a.timezone_name,
          status: a.account_status,
          metaConnectionId: conn.id,
          syncedAt: new Date(),
        },
        create: {
          tenantId: b.tenant_id,
          metaConnectionId: conn.id,
          actId: a.act_id,
          name: a.name,
          currency: a.currency,
          timezoneName: a.timezone_name,
          status: a.account_status,
        },
      });
    }

    return conn;
  });

  return NextResponse.json({ ok: true, data: { connection_id: connection.id } });
}
