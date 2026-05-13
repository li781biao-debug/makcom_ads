"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  slug: string;
  name: string;
  status: "approved" | "pending" | "rejected" | "none";
  reviewNote: string | null;
  requestedAt: string | null;
  reviewedAt: string | null;
};

const STATUS_BADGE: Record<Project["status"], { label: string; cls: string }> = {
  approved: { label: "已通过", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  pending:  { label: "审核中", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  rejected: { label: "被驳回", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  none:     { label: "未申请", cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
};

export function ApplyClient({ projects, isAdmin }: { projects: Project[]; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function apply(slug: string) {
    setError(null);
    startTransition(async () => {
      const r = await fetch("/api/projects/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, message: message || undefined }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setError(e.error ?? "提交失败");
        return;
      }
      setEditingSlug(null);
      setMessage("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded border border-red-300 bg-red-50 dark:bg-red-900/30 px-4 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-left">项目</th>
              <th className="px-4 py-3 text-left">slug</th>
              <th className="px-4 py-3 text-left">状态</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const badge = STATUS_BADGE[p.status];
              const canApply = !isAdmin && (p.status === "none" || p.status === "rejected");
              return (
                <tr key={p.id} className="border-t border-zinc-200 dark:border-zinc-800 align-top">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{p.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {p.status === "rejected" && p.reviewNote && (
                      <div className="mt-1 text-xs text-zinc-500">驳回原因：{p.reviewNote}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "approved" && (
                      <a href={`/reports?project=${p.slug}`} className="text-blue-600 hover:underline text-xs">
                        查看数据 →
                      </a>
                    )}
                    {p.status === "pending" && (
                      <span className="text-xs text-zinc-400">等待管理员审核</span>
                    )}
                    {canApply && editingSlug !== p.slug && (
                      <button
                        type="button"
                        onClick={() => { setEditingSlug(p.slug); setMessage(""); }}
                        className="rounded bg-blue-600 text-white px-3 py-1 text-xs hover:bg-blue-700"
                      >
                        {p.status === "rejected" ? "重新申请" : "申请"}
                      </button>
                    )}
                    {canApply && editingSlug === p.slug && (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="备注（可选，例如说明用途）"
                          rows={2}
                          maxLength={500}
                          className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs w-72"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => apply(p.slug)}
                            className="rounded bg-blue-600 text-white px-3 py-1 text-xs hover:bg-blue-700 disabled:opacity-50"
                          >
                            {pending ? "提交中..." : "提交"}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingSlug(null); setMessage(""); }}
                            className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {projects.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-400">
                  暂无可申请的项目
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
