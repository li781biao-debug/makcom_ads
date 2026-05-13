import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { resolveCurrentProject } from "@/lib/db/currentProject";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id?: string }).id;

  const [{ project }, me, pendingCount] = await Promise.all([
    userId ? resolveCurrentProject({ userId }) : Promise.resolve({ project: null }),
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { role: true } }) : null,
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { role: true } }).then(async (u) =>
          u?.role === "SUPER_ADMIN"
            ? prisma.projectAccessRequest.count({ where: { status: "pending" } })
            : 0,
        )
      : Promise.resolve(0),
  ]);
  const isAdmin = me?.role === "SUPER_ADMIN";

  // Conditional nav based on role. Regular users only see Reports + Apply.
  const nav: { href: string; label: string; badge?: number }[] = [
    { href: "/reports", label: "数据报表" },
    { href: "/apply", label: "申请项目权限" },
  ];
  if (isAdmin) {
    nav.push({ href: "/admin/requests", label: "审核申请", badge: pendingCount });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-4 bg-white dark:bg-zinc-900">
        <div>
          <div className="font-semibold">Makcom Ads</div>
          <div className="text-xs text-zinc-500 truncate">{project?.name ?? "无项目"}</div>
          {isAdmin && (
            <div className="mt-1 inline-block rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-medium">
              超级管理员
            </div>
          )}
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between"
            >
              <span>{n.label}</span>
              {n.badge ? (
                <span className="rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5 min-w-[18px] text-center">
                  {n.badge}
                </span>
              ) : null}
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
