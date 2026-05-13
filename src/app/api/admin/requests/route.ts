import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// Super-admin only: list project access requests.
// ?status=pending|approved|rejected|all  (default: pending)
export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (me?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status") ?? "pending";
  const where = statusFilter === "all" ? {} : { status: statusFilter };

  const requests = await prisma.projectAccessRequest.findMany({
    where,
    orderBy: { requestedAt: "desc" },
    include: {
      user: { select: { id: true, email: true, name: true } },
      tenant: { select: { id: true, slug: true, name: true } },
      reviewer: { select: { id: true, email: true, name: true } },
    },
    take: 200,
  });

  return NextResponse.json({ ok: true, requests });
}
