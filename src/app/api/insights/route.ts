import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPrimaryTenant } from "@/lib/tenant";
import { callMake } from "@/lib/make/client";
import { SCENARIOS } from "@/lib/make/scenarios";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await getPrimaryTenant(userId);
  if (!tenant) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const adAccountActId = body?.ad_account_id;
  if (!adAccountActId) {
    return NextResponse.json({ error: "ad_account_id required" }, { status: 400 });
  }

  // Find connection for this ad account
  const adAccount = await prisma.adAccount.findFirst({
    where: { tenantId: tenant.id, actId: adAccountActId },
    include: { metaConnection: true },
  });

  const makeConnectionRef = adAccount?.metaConnection?.makeConnectionRef ?? "tennixx";

  try {
    const data = await callMake({
      tenantId: tenant.id,
      scenario: SCENARIOS.META_INSIGHTS,
      payload: {
        make_connection_ref: makeConnectionRef,
        ad_account_id: adAccountActId,
        params: {
          level: body?.level ?? "campaign",
          date_preset: body?.date_preset ?? "last_7d",
          fields: body?.fields ?? ["impressions", "clicks", "spend", "cpm", "ctr", "actions"],
        },
      },
    });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
