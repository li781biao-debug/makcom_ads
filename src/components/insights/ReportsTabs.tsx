"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/reports", label: "项目数据总看板" },
  { href: "/reports/meta", label: "Meta 数据" },
  { href: "/reports/google", label: "Google 数据" },
];

export function ReportsTabs() {
  const pathname = usePathname();
  const params = useSearchParams();
  const days = params.get("days");
  const qs = days ? `?days=${days}` : "";

  return (
    <nav className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800 -mt-2">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={`${t.href}${qs}`}
            className={
              active
                ? "px-4 py-2 text-sm border-b-2 border-zinc-900 dark:border-zinc-100 -mb-px font-medium"
                : "px-4 py-2 text-sm border-b-2 border-transparent text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
