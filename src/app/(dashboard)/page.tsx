import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPrimaryTenant } from "@/lib/tenant";

export default async function OverviewPage() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;
  const tenant = await getPrimaryTenant(userId);
  if (!tenant) return <div>请先创建工作区</div>;

  const [connCount, acctCount, campaignCount, jobCount] = await Promise.all([
    prisma.metaConnection.count({ where: { tenantId: tenant.id } }),
    prisma.adAccount.count({ where: { tenantId: tenant.id } }),
    prisma.campaign.count({ where: { tenantId: tenant.id } }),
    prisma.makeJob.count({ where: { tenantId: tenant.id } }),
  ]);

  const stats = [
    { label: "Meta 连接", value: connCount },
    { label: "广告账号", value: acctCount },
    { label: "已同步 Campaigns", value: campaignCount },
    { label: "Make 调用次数", value: jobCount },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">概览</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <div className="text-sm text-zinc-500">{s.label}</div>
            <div className="text-2xl font-semibold mt-1">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h2 className="font-medium mb-2">下一步</h2>
        <ol className="list-decimal list-inside text-sm space-y-1 text-zinc-700 dark:text-zinc-300">
          <li>在 Make.com 创建 13 个场景（见 README）</li>
          <li>把各场景的 webhook URL 填入 <code>.env</code></li>
          <li>在「账号连接」里绑定 Meta 广告账号</li>
          <li>到「广告系列」开始创建投放</li>
        </ol>
      </div>
    </div>
  );
}
