import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const Body = z.object({
  slug: z.string().min(1),
  message: z.string().max(500).optional(),
});

// Submit a request to access a project. If a previous request exists for
// the same (user, tenant), we reset it back to pending so the user can
// re-apply after a rejection.
export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: parsed.data.slug } });
  if (!tenant || tenant.status !== "active") {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Already a member? No request needed.
  const existing = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId } },
  });
  if (existing) {
    return NextResponse.json({ ok: true, alreadyMember: true });
  }

  const request = await prisma.projectAccessRequest.upsert({
    where: { userId_tenantId: { userId, tenantId: tenant.id } },
    update: {
      status: "pending",
      message: parsed.data.message ?? null,
      requestedAt: new Date(),
      reviewedAt: null,
      reviewerId: null,
      reviewNote: null,
    },
    create: {
      userId,
      tenantId: tenant.id,
      status: "pending",
      message: parsed.data.message ?? null,
    },
  });

  return NextResponse.json({ ok: true, requestId: request.id, status: request.status });
}
