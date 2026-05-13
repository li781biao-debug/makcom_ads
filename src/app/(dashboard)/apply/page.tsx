import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ApplyClient } from "./ApplyClient";

export default async function ApplyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id?: string }).id!;

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

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
      select: { tenantId: true, status: true, requestedAt: true, reviewedAt: true, reviewNote: true },
    }),
  ]);

  const memberSet = new Set(memberships.map((m) => m.tenantId));
  const reqByTenant = new Map<string, (typeof requests)[number]>();
  for (const r of requests) {
    if (!reqByTenant.has(r.tenantId)) reqByTenant.set(r.tenantId, r);
  }

  const isAdmin = me?.role === "SUPER_ADMIN";
  const rows = tenants.map((t) => {
    const r = reqByTenant.get(t.id);
    let status: "approved" | "pending" | "rejected" | "none" = "none";
    if (isAdmin || memberSet.has(t.id)) status = "approved";
    else if (r) status = r.status as typeof status;
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      status,
      reviewNote: r?.reviewNote ?? null,
      requestedAt: r?.requestedAt?.toISOString() ?? null,
      reviewedAt: r?.reviewedAt?.toISOString() ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">申请项目权限</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {isAdmin
            ? "你是超级管理员，自动拥有所有项目的访问权限。"
            : "选择项目提交申请，管理员审核通过后即可在数据报表查看该项目数据。"}
        </p>
      </div>
      <ApplyClient projects={rows} isAdmin={isAdmin} />
    </div>
  );
}
