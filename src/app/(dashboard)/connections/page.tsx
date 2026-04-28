import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPrimaryTenant } from "@/lib/tenant";
import { ConnectButton } from "@/components/meta/ConnectButton";

export default async function ConnectionsPage() {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;
  const tenant = await getPrimaryTenant(userId);
  if (!tenant) return <div>请先创建工作区</div>;

  const connections = await prisma.metaConnection.findMany({
    where: { tenantId: tenant.id },
    include: { adAccounts: true },
    orderBy: { connectedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meta 账号连接</h1>
        <ConnectButton />
      </div>

      {connections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
          还没有连接 Meta 账号。点击上方按钮通过 Make.com 授权。
        </div>
      ) : (
        <ul className="space-y-3">
          {connections.map((c: typeof connections[number]) => (
            <li key={c.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{c.fbUserName ?? "(未知用户)"}</div>
                  <div className="text-xs text-zinc-500">fb_user_id: {c.fbUserId ?? "-"}</div>
                  <div className="text-xs text-zinc-500">ref: {c.makeConnectionRef}</div>
                </div>
                <div className="text-xs">
                  <span className="rounded bg-green-100 text-green-800 px-2 py-0.5">{c.status}</span>
                </div>
              </div>
              <div className="mt-3 text-sm">
                <div className="text-zinc-500 mb-1">广告账号 ({c.adAccounts.length})</div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {c.adAccounts.map((a: typeof c.adAccounts[number]) => (
                    <li key={a.id} className="text-xs flex justify-between border-t border-zinc-100 dark:border-zinc-800 py-1">
                      <span>{a.name}</span>
                      <span className="text-zinc-500">{a.actId} · {a.currency}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
