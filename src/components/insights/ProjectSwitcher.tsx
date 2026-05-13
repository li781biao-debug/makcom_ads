"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Project = { id: string; slug: string; name: string };
type Group = { id: string; slug: string; name: string };

type Props = {
  projects: Project[];
  groups?: Group[];
  defaultSlug: string | null;
};

export function ProjectSwitcher({ projects, groups = [], defaultSlug }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const currentSlug = params.get("project") ?? defaultSlug ?? projects[0]?.slug ?? "";

  function onChange(slug: string) {
    fetch("/api/project/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    }).catch(() => {});

    const sp = new URLSearchParams(params);
    sp.set("project", slug);
    router.push(`${pathname}?${sp.toString()}`);
    router.refresh();
  }

  if (projects.length === 0 && groups.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500">项目：</span>
      <select
        value={currentSlug}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
      >
        {groups.length > 0 && (
          <optgroup label="合计视图">
            {groups.map((g) => (
              <option key={g.id} value={g.slug}>
                📊 {g.name} ({g.slug})
              </option>
            ))}
          </optgroup>
        )}
        {projects.length > 0 && (
          <optgroup label="单个项目">
            {projects.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name} ({p.slug})
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
