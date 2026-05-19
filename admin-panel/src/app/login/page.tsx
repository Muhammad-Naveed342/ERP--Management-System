"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiBase, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const body = new URLSearchParams();
      body.set("username", username.trim());
      body.set("password", password);
      const res = await fetch(`${apiBase()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "Login failed" }));
        throw new Error(data.detail || "Login failed");
      }
      const data = await res.json();
      if (data.user?.role !== "admin") {
        throw new Error("Admin account required for this dashboard.");
      }
      setToken(data.access_token);
      router.replace("/admin");
    } catch (x: unknown) {
      setErr(x instanceof Error ? x.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
      <div className="absolute -bottom-8 -right-4 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 shadow-xl shadow-indigo-500/20 mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3a10.003 10.003 0 006.29 2.257m0 0A10.003 10.003 0 0112 15a10.003 10.003 0 01-6.71-2.743" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Business Portal</h1>
          <p className="mt-3 text-slate-400 font-medium">Enterprise Management System v2.0</p>
        </div>

        <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-10 shadow-2xl">
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Username</label>
              <input
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-5 py-4 text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white/10 transition-all placeholder:text-slate-600"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="off"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <input
                type="password"
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-5 py-4 text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white/10 transition-all placeholder:text-slate-600"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {err && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl text-sm font-bold text-center">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-indigo-600 py-5 font-black text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 hover:shadow-indigo-600/30 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? "AUTHENTICATING..." : "SIGN IN"}
            </button>
          </form>
        </div>
        
        <p className="text-center mt-8 text-slate-500 text-sm font-medium">
          Authorized Access Only
        </p>
      </div>
    </div>
  );
}

