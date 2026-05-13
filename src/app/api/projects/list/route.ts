import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// List all active projects + the current user's relationship to each:
//   approved  — already a member
//   pending   — has a pending access request
//   rejected  — last access request was rejected (user can re-apply)
//   none      — no relationship yet
// SUPER_ADMIN sees every project as approved.
export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = me.role === "SUPER_ADMIN";
  const [tenants, memberships, requests] = await Promise.all([
    prisma.tenant.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "asc" },
      select: { id: true, slug: true, name: true },
    }),
    prisma.tenantUser.findMany({
      where: { userId },
      select: { tenantId: true },
    }),
    prisma.projectAccessRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: "desc" },
      select: { tenantId: true, status: true },
    }),
  ]);

  const memberSet = new Set(memberships.map((m) => m.tenantId));
  const reqByTenant = new Map<string, string>();
  for (const r of requests) {
    if (!reqByTenant.has(r.tenantId)) reqByTenant.set(r.tenantId, r.status);
  }

  const projects = tenants.map((t) => {
    let status: "approved" | "pending" | "rejected" | "none";
    if (isAdmin || memberSet.has(t.id)) status = "approved";
    else status = (reqByTenant.get(t.id) as typeof status) ?? "none";
    return { id: t.id, slug: t.slug, name: t.name, status };
  });

  return NextResponse.json({ ok: true, role: me.role, projects });
}
