"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Account = { id: string; name: string | null };

type Props = {
  label: string;
  accounts: Account[];
  paramName: string; // "meta_account" or "google_account"
};

export function AdAccountSwitcher({ label, accounts, paramName }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(paramName) ?? "";

  function onChange(id: string) {
    const sp = new URLSearchParams(params);
    if (id) sp.set(paramName, id);
    else sp.delete(paramName);
    router.push(`${pathname}?${sp.toString()}`);
  }

  if (accounts.length === 0) return null;
  // If there's only one account it's still useful to show — labels the source.

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500">{label}：</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
      >
        <option value="">全部账户合计</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name ? `${a.name} (${a.id})` : a.id}
          </option>
        ))}
      </select>
    </div>
  );
}
