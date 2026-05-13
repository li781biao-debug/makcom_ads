import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const Body = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNote: z.string().max(500).optional(),
});

// Super-admin approves or rejects a project access request.
// On approve: TenantUser row is created (role=MEMBER). On reject: status flipped.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (me?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const reqRow = await prisma.projectAccessRequest.findUnique({ where: { id } });
  if (!reqRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (reqRow.status !== "pending") {
    return NextResponse.json(
      { error: `Already ${reqRow.status}, cannot ${parsed.data.action}` },
      { status: 409 },
    );
  }

  const now = new Date();

  if (parsed.data.action === "approve") {
    // Two writes in a transaction: create TenantUser, mark request approved.
    await prisma.$transaction([
      prisma.tenantUser.upsert({
        where: {
          tenantId_userId: { tenantId: reqRow.tenantId, userId: reqRow.userId },
        },
        update: {}, // idempotent — keep existing role if any
        create: { tenantId: reqRow.tenantId, userId: reqRow.userId, role: "MEMBER" },
      }),
      prisma.projectAccessRequest.update({
        where: { id },
        data: {
          status: "approved",
          reviewedAt: now,
          reviewerId: userId,
          reviewNote: parsed.data.reviewNote ?? null,
        },
      }),
    ]);
  } else {
    await prisma.projectAccessRequest.update({
      where: { id },
      data: {
        status: "rejected",
        reviewedAt: now,
        reviewerId: userId,
        reviewNote: parsed.data.reviewNote ?? null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
