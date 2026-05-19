"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";
import Link from "next/link";

type Summary = {
  users: number;
  shops: number;
  items: number;
  orders: number;
  sales: number;
  orders_total_value: number;
  sales_total_value: number;
};

export default function AdminDashboard() {
  const [s, setS] = useState<Summary | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    apiJson<Summary>("/reports/summary")
      .then(setS)
      .catch((e) => setErr(String(e.message || e)));
  }, []);

  if (err) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
      <h2 className="font-bold text-lg">Error loading dashboard</h2>
      <p className="mt-1">{err}</p>
    </div>
  );

  if (!s) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  const cards = [
    { label: "Total Users", value: s.users, href: "/admin/users", color: "indigo" },
    { label: "Registered Shops", value: s.shops, href: "/admin/shops", color: "blue" },
    { label: "Available Items", value: s.items, href: "/admin/items", color: "purple" },
    { label: "Total Orders", value: s.orders, href: "/admin/orders", color: "orange" },
    { label: "Total Sales", value: s.sales, href: "/admin/sales", color: "emerald" },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Overview</h1>
        <p className="mt-2 text-slate-500 font-medium text-lg">Real-time metrics of your distribution operations.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-100"
          >
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-indigo-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
            
            <div className="relative z-10">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">{c.label}</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-black text-slate-900 leading-none">{c.value}</span>
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
              </div>
            </div>
            
            <div className="mt-8 flex items-center text-xs font-bold text-indigo-600 group-hover:gap-2 transition-all">
              View details 
              <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
          <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">Gross Order Value</div>
          <div className="mt-4 text-4xl font-black text-indigo-700 tracking-tight">
            Rs. {s.orders_total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="mt-2 text-slate-500 text-sm italic">Accumulated total from all order lines.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
          <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Realized Sales</div>
          <div className="mt-4 text-4xl font-black text-emerald-600 tracking-tight">
            Rs. {s.sales_total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="mt-2 text-slate-500 text-sm italic">Actual sales revenue confirmed in system.</p>
        </div>
      </div>
    </div>
  );
}

