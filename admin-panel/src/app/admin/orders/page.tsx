"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";

type Order = {
  id: number;
  shop_id: number;
  item_id: number;
  quantity: number;
  total_price: number;
  created_by: number;
  timestamp: string;
  unit_type: string;
  shop_name?: string | null;
  item_name?: string | null;
  synced_at?: string | null;
  created_by_name?: string | null;
};

export default function OrdersAdmin() {
  const [rows, setRows] = useState<Order[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTaker, setSearchTaker] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    setLoading(true);
    apiJson<Order[]>("/orders/")
      .then(setRows)
      .catch((e) => setErr(String(e.message || e)))
      .finally(() => setLoading(false));
  }, []);

  const deleteOrdersByDate = async () => {
    if (!selectedDate) return;
    if (!confirm(`Are you sure you want to permanently delete ALL orders synced on ${selectedDate}? This action is permanent and cannot be undone.`)) return;
    try {
      setLoading(true);
      await apiJson(`/orders/by-date/${selectedDate}`, { method: "DELETE" });
      setRows(rows.filter((o) => {
        const orderDate = new Date(o.synced_at || o.timestamp);
        const yyyy = orderDate.getFullYear();
        const mm = String(orderDate.getMonth() + 1).padStart(2, "0");
        const dd = String(orderDate.getDate()).padStart(2, "0");
        const orderDateStr = `${yyyy}-${mm}-${dd}`;
        return orderDateStr !== selectedDate;
      }));
      setSelectedDate("");
      alert("Orders for the selected date deleted successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to bulk delete orders.");
    } finally {
      setLoading(false);
    }
  };

  const deleteSingleOrder = async (id: number) => {
    if (!confirm(`Are you sure you want to permanently delete order #${id}?`)) return;
    try {
      setLoading(true);
      await apiJson(`/orders/${id}`, { method: "DELETE" });
      setRows(rows.filter((o) => o.id !== id));
    } catch (e: any) {
      alert(e.message || "Failed to delete order.");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dt: string | null | undefined) => {
    if (!dt) return "Pending Sync";
    try {
      let normalizedDt = dt;
      if (!dt.endsWith("Z") && !dt.includes("+") && dt.includes("T")) {
        normalizedDt = dt + "Z";
      }
      
      const date = new Date(normalizedDt);
      if (isNaN(date.getTime())) return dt;

      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Karachi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      };

      const formatter = new Intl.DateTimeFormat("en-US", options);
      const parts = formatter.formatToParts(date);

      let year = "", month = "", day = "", hour = "", minute = "", dayPeriod = "";
      for (const part of parts) {
        if (part.type === "year") year = part.value;
        if (part.type === "month") month = part.value;
        if (part.type === "day") day = part.value;
        if (part.type === "hour") hour = part.value;
        if (part.type === "minute") minute = part.value;
        if (part.type === "dayPeriod") dayPeriod = part.value;
      }

      const paddedHour = hour.padStart(2, "0");
      return `${year}-${month}-${day} ${paddedHour}:${minute} ${dayPeriod}`;
    } catch {
      return dt;
    }
  };

  const filteredRows = rows.filter((o) => {
    const takerName = (o.created_by_name || "").toLowerCase();
    return takerName.includes(searchTaker.toLowerCase());
  });

  if (err) return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-3xl flex items-center gap-3">
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
      <span className="font-bold">{err}</span>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Order Logs</h1>
          <p className="text-slate-500 font-medium">Review and monitor all incoming orders from the distribution network.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Filter */}
          <div className="relative">
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Filter by Order Taker..."
              value={searchTaker}
              onChange={(e) => setSearchTaker(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-60 transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Bulk Date Deletion Controls */}
          <div className="flex items-center gap-2 border border-rose-100 bg-rose-50/20 p-1.5 rounded-2xl">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-slate-700 bg-white"
            />
            <button
              onClick={deleteOrdersByDate}
              disabled={!selectedDate || loading}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              🗑️ Delete by Date
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Order Number</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Order Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Shop & Customer</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Product Info</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total Value</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Sync Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {loading ? (
                <tr>
                   <td colSpan={9} className="px-6 py-20 text-center">
                     <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                   </td>
                </tr>
              ) : filteredRows.map((o, idx) => (
                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50/60 px-3 py-1.5 rounded-xl tracking-wider">
                      ORD-{String(idx + 1).padStart(2, "0")}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        👤
                      </div>
                      <span className="text-sm font-bold text-slate-800">{o.created_by_name || "Ahmed"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {o.shop_name?.substring(0, 1) || "S"}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{o.shop_name ?? `Shop #${o.shop_id}`}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-slate-600">
                    {o.item_name ?? `Item #${o.item_id}`}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-bold ${
                      o.unit_type === "carton"
                        ? "bg-amber-50 text-amber-700 border border-amber-200/50"
                        : "bg-indigo-50 text-indigo-700 border border-indigo-200/50"
                    }`}>
                      {o.quantity} {o.unit_type === "carton" ? (o.quantity === 1 ? "Carton" : "Cartons") : (o.quantity === 1 ? "Piece" : "Pieces")}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm font-black text-slate-900">Rs. {Number(o.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-slate-500">
                    {formatDateTime(o.synced_at || o.timestamp)}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${o.synced_at ? 'bg-emerald-500' : 'bg-orange-400 animate-pulse'}`}></div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${o.synced_at ? 'text-emerald-600' : 'text-orange-500'}`}>
                        {o.synced_at ? 'Synced' : 'Pending'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => deleteSingleOrder(o.id)}
                      className="text-rose-600 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 p-2 rounded-xl transition-colors"
                      title="Delete Order"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                    No orders found matching the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

