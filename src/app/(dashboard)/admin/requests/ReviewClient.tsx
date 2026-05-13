"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Request = {
  id: string;
  status: string;
  message: string | null;
  reviewNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  user: { id: string; email: string; name: string | null };
  tenant: { id: string; slug: string; name: string };
  reviewerEmail: string | null;
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  approved: { label: "已通过", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  pending:  { label: "待审核", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  rejected: { label: "已驳回", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

export function ReviewClient({ requests }: { requests: Request[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function review(id: string, action: "approve" | "reject") {
    setError(null);
    startTransition(async () => {
      const r = await fetch(`/api/admin/requests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNote: note || undefined }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setError(e.error ?? "操作失败");
        return;
      }
      setActiveId(null);
      setNote("");
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
              <th className="px-4 py-3 text-left">申请人</th>
              <th className="px-4 py-3 text-left">项目</th>
              <th className="px-4 py-3 text-left">申请时间</th>
              <th className="px-4 py-3 text-left">状态</th>
              <th className="px-4 py-3 text-left">备注</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending;
              const isPending = r.status === "pending";
              return (
                <tr key={r.id} className="border-t border-zinc-200 dark:border-zinc-800 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.user.name ?? r.user.email}</div>
                    <div className="text-xs text-zinc-500">{r.user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.tenant.name}</div>
                    <div className="text-xs text-zinc-500">{r.tenant.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(r.requestedAt).toLocaleString("zh-CN")}
                    {r.reviewedAt && (
                      <div className="mt-1">审核于 {new Date(r.reviewedAt).toLocaleString("zh-CN")}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {r.reviewerEmail && (
                      <div className="mt-1 text-xs text-zinc-500">by {r.reviewerEmail}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[280px]">
                    {r.message && <div className="text-zinc-700 dark:text-zinc-300">申请说明：{r.message}</div>}
                    {r.reviewNote && <div className="mt-1 text-zinc-500">审核备注：{r.reviewNote}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {isPending && activeId !== r.id && (
                      <button
                        type="button"
                        onClick={() => { setActiveId(r.id); setNote(""); }}
                        className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        审核
                      </button>
                    )}
                    {isPending && activeId === r.id && (
                      <div className="flex flex-col gap-2 min-w-[240px]">
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="审核备注（可选）"
                          rows={2}
                          maxLength={500}
                          className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => review(r.id, "approve")}
                            className="rounded bg-green-600 text-white px-3 py-1 text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            通过
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => review(r.id, "reject")}
                            className="rounded bg-red-600 text-white px-3 py-1 text-xs hover:bg-red-700 disabled:opacity-50"
                          >
                            驳回
                          </button>
                          <button
                            type="button"
                            onClick={() => { setActiveId(null); setNote(""); }}
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
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-400">
                  暂无相关申请
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
