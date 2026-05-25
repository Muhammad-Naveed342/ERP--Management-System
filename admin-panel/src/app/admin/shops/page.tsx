"use client";

import { useEffect, useState, FormEvent } from "react";
import { apiJson } from "@/lib/api";

type Shop = { id: number; shop_name: string; location?: string | null; mobile_phone?: string | null };

export default function ShopsAdmin() {
  const [rows, setRows] = useState<Shop[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setErr("");
    try {
      setRows(await apiJson<Shop[]>("/shops/"));
    } catch (e: unknown) {
      setErr(String(e instanceof Error ? e.message : e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setErr("");
    setLoading(true);
    try {
      await apiJson("/shops/", {
        method: "POST",
        body: JSON.stringify({ 
          shop_name: name.trim(),
          location: location.trim() || null,
          mobile_phone: mobilePhone.trim() || null
        }),
      });
      setName("");
      setLocation("");
      setMobilePhone("");
      await load();
    } catch (e: unknown) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Are you sure you want to delete this shop?")) return;
    setErr("");
    try {
      await apiJson(`/shops/${id}`, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      setErr(String(e instanceof Error ? e.message : e));
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Shop Management</h1>
        <p className="text-slate-500 font-medium">Manage the list of distribution points and retail partners.</p>
      </div>

      {err && (
        <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-2xl text-sm font-semibold flex items-center justify-between shadow-sm animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{err}</span>
          </div>
          <button 
            type="button"
            onClick={() => setErr("")}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-100/50 transition-all ml-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm w-full">
        <form onSubmit={onCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Shop Name</label>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                placeholder="e.g. Al-Madina Super Mart"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Location / Address</label>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                placeholder="e.g. Main Bazar, Lahore"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Mobile Phone</label>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                placeholder="e.g. 0300-1234567"
                value={mobilePhone}
                onChange={(e) => setMobilePhone(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="rounded-2xl bg-indigo-600 px-8 py-3.5 text-white font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Shop"}
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((s, idx) => (
          <div
            key={s.id}
            className="group flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:border-indigo-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-slate-900 text-lg">{s.shop_name}</div>
                {s.location && (
                  <div className="text-xs text-indigo-600 font-bold mt-1 flex items-center gap-1 bg-indigo-50/50 px-2.5 py-1 rounded-xl w-fit">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {s.location}
                  </div>
                )}
                {s.mobile_phone && (
                  <div className="text-xs text-slate-600 font-bold mt-1 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl w-fit">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {s.mobile_phone}
                  </div>
                )}
                <div className="text-xs text-indigo-600 font-extrabold uppercase tracking-wider mt-2 bg-indigo-50 px-3 py-1 rounded-xl w-fit">
                  Shop {idx + 1}
                </div>
              </div>
            </div>
            <button 
              type="button" 
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all" 
              onClick={() => remove(s.id)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {rows.length === 0 && (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl">
          <p className="text-slate-400 font-medium">No shops found. Add your first shop above.</p>
        </div>
      )}
    </div>
  );
}
