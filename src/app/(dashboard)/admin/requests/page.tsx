import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ReviewClient } from "./ReviewClient";

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id?: string }).id!;
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center text-zinc-500">
        无权限访问此页面（需要超级管理员）。
      </div>
    );
  }

  const params = (await searchParams) ?? {};
  const statusFilter = params.status ?? "pending";
  const where = statusFilter === "all" ? {} : { status: statusFilter };

  const requests = await prisma.projectAccessRequest.findMany({
    where,
    orderBy: { requestedAt: "desc" },
    include: {
      user: { select: { id: true, email: true, name: true } },
      tenant: { select: { id: true, slug: true, name: true } },
      reviewer: { select: { id: true, email: true } },
    },
    take: 200,
  });

  const counts = await prisma.projectAccessRequest.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold">项目权限申请审核</h1>
        <div className="flex gap-2 text-sm">
          {(["pending", "approved", "rejected", "all"] as const).map((s) => {
            const label = s === "pending" ? "待审核" : s === "approved" ? "已通过" : s === "rejected" ? "已驳回" : "全部";
            const n = s === "all"
              ? Object.values(countMap).reduce((a, b) => a + (b as number), 0)
              : countMap[s] ?? 0;
            const active = statusFilter === s;
            return (
              <a
                key={s}
                href={`/admin/requests?status=${s}`}
                className={
                  active
                    ? "px-3 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "px-3 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }
              >
                {label} ({n})
              </a>
            );
          })}
        </div>
      </div>
      <ReviewClient
        requests={requests.map((r) => ({
          id: r.id,
          status: r.status,
          message: r.message,
          reviewNote: r.reviewNote,
          requestedAt: r.requestedAt.toISOString(),
          reviewedAt: r.reviewedAt?.toISOString() ?? null,
          user: r.user,
          tenant: r.tenant,
          reviewerEmail: r.reviewer?.email ?? null,
        }))}
      />
    </div>
  );
}
