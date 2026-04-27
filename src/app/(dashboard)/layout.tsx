import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { getPrimaryTenant } from "@/lib/tenant";

const NAV = [
  { href: "/", label: "概览" },
  { href: "/reports", label: "数据报表" },
  { href: "/connections", label: "账号连接" },
  { href: "/insights", label: "数据看板" },
  { href: "/campaigns", label: "广告系列" },
  { href: "/adsets", label: "广告组" },
  { href: "/ads", label: "广告" },
  { href: "/creatives", label: "素材 / Creative" },
  { href: "/jobs", label: "Make 调用日志" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  const tenant = userId ? await getPrimaryTenant(userId) : null;

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-4 bg-white dark:bg-zinc-900">
        <div>
          <div className="font-semibold">Makcom Ads</div>
          <div className="text-xs text-zinc-500 truncate">{tenant?.name ?? "无工作区"}</div>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto text-xs">
          <div className="truncate text-zinc-600 dark:text-zinc-400 mb-2">{session.user.email}</div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className="w-full rounded border border-zinc-300 dark:border-zinc-700 py-1">登出</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
