import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPrimaryTenant } from "@/lib/tenant";
import InsightsClient from "./insights-client";

export default async function InsightsPage() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;
  const tenant = await getPrimaryTenant(userId);
  if (!tenant) return <div>请先创建工作区</div>;

  const accounts = await prisma.adAccount.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: "asc" },
  });

  // If no accounts connected yet, show hardcoded option for testing
  const accountOptions = accounts.length > 0
    ? accounts.map((a) => ({ actId: a.actId, name: a.name }))
    : [{ actId: "act_1033278815370078", name: "Enhanced-Tenniix-01 (测试)" }];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">数据看板</h1>
      <InsightsClient accounts={accountOptions} />
    </div>
  );
}
