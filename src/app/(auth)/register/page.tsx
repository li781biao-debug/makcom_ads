"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, tenantName }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setLoading(false);
      setError(j.error ?? "注册失败");
      return;
    }
    await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-semibold">注册</h1>
        <div className="space-y-2">
          <label className="block text-sm">工作区名称</label>
          <input required value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="e.g. My Agency" className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">姓名</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">邮箱</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">密码（至少 8 位）</label>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 py-2 font-medium disabled:opacity-50">
          {loading ? "处理中..." : "创建账号"}
        </button>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          已有账号？<Link href="/login" className="underline">登录</Link>
        </p>
      </form>
    </div>
  );
}
