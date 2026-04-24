import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPrimaryTenant } from "@/lib/tenant";

export default async function JobsPage() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;
  const tenant = await getPrimaryTenant(userId);
  if (!tenant) return null;

  const jobs = await prisma.makeJob.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Make 调用日志</h1>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-2">时间</th>
              <th className="px-4 py-2">场景</th>
              <th className="px-4 py-2">状态</th>
              <th className="px-4 py-2">耗时 ms</th>
              <th className="px-4 py-2">错误</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j: typeof jobs[number]) => (
              <tr key={j.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-2 text-xs text-zinc-500">{j.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td>
                <td className="px-4 py-2">{j.scenario}</td>
                <td className="px-4 py-2">
                  <span className={j.status === "success" ? "text-green-600" : j.status === "error" ? "text-red-600" : "text-zinc-500"}>
                    {j.status}
                  </span>
                </td>
                <td className="px-4 py-2">{j.durationMs ?? "-"}</td>
                <td className="px-4 py-2 text-xs text-red-600 max-w-md truncate">{j.error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
