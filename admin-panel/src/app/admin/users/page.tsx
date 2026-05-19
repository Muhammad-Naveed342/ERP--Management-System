"use client";

import { apiJson } from "@/lib/api";
import { FormEvent, useEffect, useState } from "react";

type User = { 
  id: number; 
  username: string; 
  role: string; 
  is_active: boolean;
  hashed_password?: string;
  plain_password?: string;
};

export default function UsersAdmin() {
  const [rows, setRows] = useState<User[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("order_taker");
  const [active, setActive] = useState(true);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setErr("");
    try {
      setRows(await apiJson<User[]>("/users/"));
    } catch (e: unknown) {
      setErr(String(e instanceof Error ? e.message : e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await apiJson("/users/", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          password,
          role,
          is_active: active,
        }),
      });
      setUsername("");
      setPassword("");
      await load();
    } catch (e: unknown) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  async function toggle(u: User) {
    setErr("");
    try {
      await apiJson(`/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      await load();
    } catch (e: unknown) {
      setErr(String(e instanceof Error ? e.message : e));
    }
  }

  async function remove(u: User) {
    if (!confirm(`Are you sure you want to delete user "${u.username}"?`)) return;
    setErr("");
    try {
      await apiJson(`/users/${u.id}`, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      setErr(String(e instanceof Error ? e.message : e));
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">User Management</h1>
          <p className="text-slate-500 font-medium">Create and manage accounts for order takers and sales teams.</p>
        </div>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {err}
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Creation Form */}
        <div className="lg:col-span-1">
          <form
            onSubmit={onCreate}
            className="sticky top-10 space-y-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <h2 className="text-xl font-bold text-slate-900">New Account</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Username</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400 font-medium"
                  placeholder="e.g. john_doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400 font-medium"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Access Role</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium appearance-none"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="order_taker">Order Taker</option>
                  <option value="sales_man">Sales Man</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </div>
                <span className="text-sm font-semibold text-slate-700">Set as Active</span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-6 py-4 text-white font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 transition-all disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>
        </div>

        {/* User Table */}
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User Details</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Password (Original)</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {rows.map((u, index) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase">
                          {u.username.substring(0, 2)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{u.username}</div>
                          <div className="text-xs text-slate-400">No: {index + 1}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md inline-block">
                        {u.plain_password || "********"}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                        <span className={`text-sm font-bold ${u.is_active ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right space-x-3">
                      <button
                        type="button"
                        className={`text-sm font-bold transition-colors ${
                          u.is_active ? 'text-slate-400 hover:text-slate-600' : 'text-indigo-600 hover:text-indigo-800'
                        }`}
                        onClick={() => toggle(u)}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
                        onClick={() => remove(u)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="p-20 text-center text-slate-400 font-medium italic">
                No users found. Start by creating one.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

