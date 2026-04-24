import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPrimaryTenant } from "@/lib/tenant";

export default async function CampaignsPage() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;
  const tenant = await getPrimaryTenant(userId);
  if (!tenant) return <div>请先创建工作区</div>;

  const campaigns = await prisma.campaign.findMany({
    where: { tenantId: tenant.id },
    include: { adAccount: true },
    orderBy: { syncedAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">广告系列 Campaigns</h1>
        <button disabled className="rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 px-4 py-2 text-sm">新建（待接入）</button>
      </div>
      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm">暂无数据</div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th className="px-4 py-2">名称</th>
                <th className="px-4 py-2">账号</th>
                <th className="px-4 py-2">目标</th>
                <th className="px-4 py-2">状态</th>
                <th className="px-4 py-2">日预算</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c: typeof campaigns[number]) => (
                <tr key={c.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2 text-zinc-500">{c.adAccount.name}</td>
                  <td className="px-4 py-2">{c.objective}</td>
                  <td className="px-4 py-2">{c.status}</td>
                  <td className="px-4 py-2">{c.dailyBudget ? (c.dailyBudget / 100).toFixed(2) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
