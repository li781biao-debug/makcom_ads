"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError("邮箱或密码错误");
    else router.push(from);
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
      <h1 className="text-2xl font-semibold">登录</h1>
      <div className="space-y-2">
        <label className="block text-sm">邮箱</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2" />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">密码</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="w-full rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 py-2 font-medium disabled:opacity-50">
        {loading ? "登录中..." : "登录"}
      </button>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        还没有账号？<Link href="/register" className="underline">注册</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
