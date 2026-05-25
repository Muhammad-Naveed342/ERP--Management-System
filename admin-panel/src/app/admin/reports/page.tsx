"use client";

import { apiJson } from "@/lib/api";
import { useEffect, useState } from "react";

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

type Sale = {
  id: number;
  shop_id: number;
  item_id: number;
  quantity: number;
  income_received: number;
  loan: number;
  total_price: number;
  created_by: number;
  timestamp: string;
  unit_type: string;
  shop_name?: string | null;
  item_name?: string | null;
  synced_at?: string | null;
  created_by_name?: string | null;
};

export default function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [orderDate, setOrderDate] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [orderTakerFilter, setOrderTakerFilter] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState("");
  const [printType, setPrintType] = useState<"orders" | "sales" | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiJson<Order[]>("/orders/"),
      apiJson<Sale[]>("/sales/")
    ])
      .then(([ordersData, salesData]) => {
        setOrders(ordersData);
        setSales(salesData);
      })
      .catch((e) => setErr(String(e.message || e)))
      .finally(() => setLoading(false));
  }, []);

  // Filter orders by date in Pakistan Standard Time (PKT)
  const getSelectedOrders = () => {
    if (!orderDate) return [];
    return orders.filter((o) => {
      if (orderTakerFilter && !(o.created_by_name || "").toLowerCase().includes(orderTakerFilter.toLowerCase())) {
        return false;
      }

      const dt = o.synced_at || o.timestamp;
      let normalizedDt = dt;
      if (!dt.endsWith("Z") && !dt.includes("+") && dt.includes("T")) {
        normalizedDt = dt + "Z";
      }
      const date = new Date(normalizedDt);
      if (isNaN(date.getTime())) return false;

      // Format to match selected calendar date string YYYY-MM-DD in Asia/Karachi time zone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Karachi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      const parts = formatter.formatToParts(date);
      let year = "", month = "", day = "";
      for (const part of parts) {
        if (part.type === "year") year = part.value;
        if (part.type === "month") month = part.value;
        if (part.type === "day") day = part.value;
      }
      return `${year}-${month}-${day}` === orderDate;
    });
  };

  // Filter sales by date in Pakistan Standard Time (PKT)
  const getSelectedSales = () => {
    if (!saleDate) return [];
    return sales.filter((s) => {
      if (salesmanFilter && !(s.created_by_name || "").toLowerCase().includes(salesmanFilter.toLowerCase())) {
        return false;
      }

      const dt = s.synced_at || s.timestamp;
      let normalizedDt = dt;
      if (!dt.endsWith("Z") && !dt.includes("+") && dt.includes("T")) {
        normalizedDt = dt + "Z";
      }
      const date = new Date(normalizedDt);
      if (isNaN(date.getTime())) return false;

      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Karachi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      const parts = formatter.formatToParts(date);
      let year = "", month = "", day = "";
      for (const part of parts) {
        if (part.type === "year") year = part.value;
        if (part.type === "month") month = part.value;
        if (part.type === "day") day = part.value;
      }
      return `${year}-${month}-${day}` === saleDate;
    });
  };

  const selectedOrders = getSelectedOrders();
  const selectedSales = getSelectedSales();

  const totalOrdersValue = selectedOrders.reduce((sum, o) => sum + Number(o.total_price), 0);
  const totalSalesValue = selectedSales.reduce((sum, s) => sum + Number(s.total_price), 0);
  const totalIncomeReceived = selectedSales.reduce((sum, s) => sum + Number(s.income_received), 0);
  const totalOutstandingLoan = selectedSales.reduce((sum, s) => sum + Number(s.loan), 0);

  // General timezone custom formatter
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

  const exportOrdersExcel = () => {
    if (selectedOrders.length === 0) return;

    const headers = [
      "Order Number",
      "Order Taker Name",
      "Shop Name",
      "Product Name",
      "Quantity",
      "Unit Type",
      "Total Price (Rs.)",
      "Date Time (PKT)",
      "Sync Status"
    ];

    const rows = selectedOrders.map((o, idx) => [
      `ORD-${String(idx + 1).padStart(2, "0")}`,
      o.created_by_name || "Ahmed",
      o.shop_name || `Shop #${o.shop_id}`,
      o.item_name || `Item #${o.item_id}`,
      o.quantity,
      o.unit_type,
      o.total_price,
      formatDateTime(o.synced_at || o.timestamp),
      o.synced_at ? "Synced" : "Pending"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `orders_dispatch_report_${orderDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSalesExcel = () => {
    if (selectedSales.length === 0) return;

    const headers = [
      "Sales Number",
      "Salesman Name",
      "Shop Name",
      "Product Name",
      "Quantity",
      "Unit Type",
      "Income Received (Rs.)",
      "Outstanding Loan (Rs.)",
      "Total Value (Rs.)",
      "Date Time (PKT)"
    ];

    const rows = selectedSales.map((s, idx) => [
      `REC-${String(idx + 1).padStart(2, "0")}`,
      s.created_by_name || "Ahmed",
      s.shop_name || `Shop #${s.shop_id}`,
      s.item_name || `Item #${s.item_id}`,
      s.quantity,
      s.unit_type,
      s.income_received,
      s.loan,
      s.total_price,
      formatDateTime(s.synced_at || s.timestamp)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `salesman_revenue_report_${saleDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = (type: "orders" | "sales") => {
    setPrintType(type);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (err) return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-3xl font-bold">
      {err}
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">

      {/* 🖨️ Printable Area (Only shown in printer viewport based on printType) */}
      {printType === "orders" && (
        <div className="hidden print:block font-sans text-slate-900 bg-white p-8 print-section">
          <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-indigo-900">Haider Traders</h1>
              <h2 className="text-xl font-bold text-slate-800 mt-1">Orders Dispatch Summary Report</h2>
              <p className="text-xs text-slate-400 font-medium mt-2">Generated: {new Date().toLocaleString()}</p>
            </div>
            <div className="text-right bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <div className="text-xs font-bold text-slate-400 uppercase">Target Date</div>
              <div className="text-lg font-black text-indigo-700 mt-1">{orderDate}</div>
            </div>
          </div>

          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-100/50 text-slate-700">
                <th className="py-3 px-2 font-bold">Order No.</th>
                <th className="py-3 px-2 font-bold">Order Taker</th>
                <th className="py-3 px-2 font-bold">Shop & Customer</th>
                <th className="py-3 px-2 font-bold">Product Info</th>
                <th className="py-3 px-2 font-bold text-center">Qty</th>
                <th className="py-3 px-2 font-bold">Unit Type</th>
                <th className="py-3 px-2 font-bold text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {selectedOrders.map((o, idx) => (
                <tr key={o.id} className="text-slate-700">
                  <td className="py-2.5 px-2 font-bold text-indigo-600">ORD-{String(idx + 1).padStart(2, "0")}</td>
                  <td className="py-2.5 px-2 font-semibold">{o.created_by_name || "Ahmed"}</td>
                  <td className="py-2.5 px-2 font-medium">{o.shop_name ?? `Shop #${o.shop_id}`}</td>
                  <td className="py-2.5 px-2 font-medium text-slate-600">{o.item_name ?? `Item #${o.item_id}`}</td>
                  <td className="py-2.5 px-2 text-center font-extrabold text-slate-900">{o.quantity}</td>
                  <td className="py-2.5 px-2 font-medium capitalize text-slate-500">{o.unit_type}</td>
                  <td className="py-2.5 px-2 text-right font-black text-slate-900">Rs. {Number(o.total_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 border-t border-slate-200 pt-6 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400">Total Dispatch Orders: {selectedOrders.length}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400">Grand Total Value: </span>
              <span className="text-xl font-black text-indigo-900 ml-1">
                Rs. {totalOrdersValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="mt-16 text-center text-[11px] font-extrabold tracking-widest text-slate-300 border-t border-slate-100 pt-4 uppercase">
            Developed by Naveed Developer
          </div>
        </div>
      )}

      {printType === "sales" && (
        <div className="hidden print:block font-sans text-slate-900 bg-white p-8 print-section">
          <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-emerald-900">Haider Traders </h1>
              <h2 className="text-xl font-bold text-slate-800 mt-1">Salesman Revenue Realization Report</h2>
              <p className="text-xs text-slate-400 font-medium mt-2">Generated: {new Date().toLocaleString()}</p>
            </div>
            <div className="text-right bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <div className="text-xs font-bold text-slate-400 uppercase">Target Date</div>
              <div className="text-lg font-black text-emerald-700 mt-1">{saleDate}</div>
            </div>
          </div>

          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-100/50 text-slate-700">
                <th className="py-3 px-2 font-bold">Sales No.</th>
                <th className="py-3 px-2 font-bold">Salesman</th>
                <th className="py-3 px-2 font-bold">Shop & Customer</th>
                <th className="py-3 px-2 font-bold">Product Info</th>
                <th className="py-3 px-2 font-bold text-center">Qty</th>
                <th className="py-3 px-2 font-bold text-right">Income Rec.</th>
                <th className="py-3 px-2 font-bold text-right">Loan Outstanding</th>
                <th className="py-3 px-2 font-bold text-right">Total Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {selectedSales.map((s, idx) => (
                <tr key={s.id} className="text-slate-700">
                  <td className="py-2.5 px-2 font-bold text-emerald-600">REC-{String(idx + 1).padStart(2, "0")}</td>
                  <td className="py-2.5 px-2 font-semibold">{s.created_by_name || "Ahmed"}</td>
                  <td className="py-2.5 px-2 font-medium">{s.shop_name ?? `Shop #${s.shop_id}`}</td>
                  <td className="py-2.5 px-2 font-medium text-slate-600">{s.item_name ?? `Item #${s.item_id}`}</td>
                  <td className="py-2.5 px-2 text-center font-extrabold text-slate-900">
                    {s.quantity} {s.unit_type}
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-emerald-600">Rs. {Number(s.income_received).toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right font-bold text-rose-500">Rs. {Number(s.loan).toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right font-black text-slate-900">Rs. {Number(s.total_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 border-t border-slate-200 pt-6 grid grid-cols-3 text-right text-xs gap-4 font-bold text-slate-600">
            <div>
              <span className="block text-slate-400 font-bold">Total Cash Income</span>
              <span className="text-lg font-black text-emerald-600 mt-1 block">Rs. {totalIncomeReceived.toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-bold">Total Loan Outstanding</span>
              <span className="text-lg font-black text-rose-500 mt-1 block">Rs. {totalOutstandingLoan.toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-bold">Total Sales Value</span>
              <span className="text-lg font-black text-slate-900 mt-1 block">Rs. {totalSalesValue.toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-16 text-center text-[11px] font-extrabold tracking-widest text-slate-300 border-t border-slate-100 pt-4 uppercase">
            Developed by Naveed Developer
          </div>
        </div>
      )}

      {/* 🖥️ Interactive Web Screen Layout */}
      <div className="print:hidden space-y-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Reports</h1>
          <p className="mt-2 text-slate-500 font-medium">Generate, export, and print distribution reports for orders and salesman revenue.</p>
        </div>

        {/* 📦 Section 1: Order logs Dispatch Report Generator */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden p-8 space-y-6">
          <div className="border-b pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
                <span>📦</span> Daily Orders Dispatch Report Generator
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Export high-fidelity spreadsheet logs or print invoice lists for dispatch drivers.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="Filter by Order Taker..."
                value={orderTakerFilter}
                onChange={(e) => setOrderTakerFilter(e.target.value)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-700 w-full sm:w-auto"
              />
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-700 w-full sm:w-auto"
              />
            </div>
          </div>

          {orderDate ? (
            selectedOrders.length > 0 ? (
              <div className="space-y-6">
                {/* Order Metrics Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50/50 p-6 rounded-2xl border">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Target Day</span>
                    <span className="text-sm font-extrabold text-slate-700 mt-1 block">{orderDate}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Dispatched Orders</span>
                    <span className="text-sm font-extrabold text-indigo-600 mt-1 block">{selectedOrders.length} orders</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Grand Value</span>
                    <span className="text-sm font-extrabold text-emerald-600 mt-1 block">Rs. {totalOrdersValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Actions Panel */}
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={exportOrdersExcel}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    📥 Export to Excel (CSV)
                  </button>
                  <button
                    onClick={() => printReport("orders")}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-950 text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    🖨️ Print Dispatch Report
                  </button>
                </div>

                {/* Orders list preview */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="bg-slate-50 border-b px-6 py-4 font-bold text-slate-700 text-sm">
                    Orders Preview list ({orderDate})
                  </div>
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {selectedOrders.map((o, idx) => (
                      <div key={o.id} className="px-6 py-4 flex items-center justify-between text-sm hover:bg-slate-50/50">
                        <div className="flex items-center gap-4">
                          <span className="font-extrabold text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg">
                            ORD-{String(idx + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">{o.shop_name ?? `Shop #${o.shop_id}`}</div>
                            <div className="text-xs text-slate-400 font-medium">Order Name: {o.created_by_name || "Ahmed"}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-slate-800">Rs. {Number(o.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          <div className="text-xs text-slate-400 font-bold capitalize">{o.quantity} {o.unit_type}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center border border-dashed rounded-3xl text-slate-400 bg-slate-50/50">
                <div className="text-3xl mb-3">📭</div>
                <div className="font-bold">No orders logged on this date.</div>
                <div className="text-xs text-slate-400 mt-1">Please select another date from the calendar to generate report summaries.</div>
              </div>
            )
          ) : (
            <div className="p-12 text-center border border-dashed rounded-3xl text-slate-400 bg-slate-50/50">
              <div className="text-3xl mb-3">📅</div>
              <div className="font-bold">Select a date from the picker above</div>
              <div className="text-xs text-slate-400 mt-1">Select a specific date to view preview logs, print report summaries, or generate spreadsheets.</div>
            </div>
          )}
        </div>

        {/* 💼 Section 2: Salesman Revenue Report Generator */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden p-8 space-y-6">
          <div className="border-b pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
                <span>💼</span> Daily Salesman Revenue Report Generator
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Track cash income realizations and outstanding customer credit (loans) for your salesmen.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="Filter by Salesman..."
                value={salesmanFilter}
                onChange={(e) => setSalesmanFilter(e.target.value)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-700 w-full sm:w-auto"
              />
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-700 w-full sm:w-auto"
              />
            </div>
          </div>

          {saleDate ? (
            selectedSales.length > 0 ? (
              <div className="space-y-6">
                {/* Sales Metrics Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-6 rounded-2xl border">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Realized Cash</span>
                    <span className="text-sm font-extrabold text-emerald-600 mt-1 block">Rs. {totalIncomeReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Loans Outstanding</span>
                    <span className="text-sm font-extrabold text-rose-500 mt-1 block">Rs. {totalOutstandingLoan.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Realized Sales Value</span>
                    <span className="text-sm font-extrabold text-slate-900 mt-1 block">Rs. {totalSalesValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Actions Panel */}
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={exportSalesExcel}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    📥 Export Sales to Excel (CSV)
                  </button>
                  <button
                    onClick={() => printReport("sales")}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-950 text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    🖨️ Print Sales Report
                  </button>
                </div>

                {/* Sales list preview */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="bg-slate-50 border-b px-6 py-4 font-bold text-slate-700 text-sm">
                    Sales Records Preview list ({saleDate})
                  </div>
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {selectedSales.map((s, idx) => (
                      <div key={s.id} className="px-6 py-4 flex items-center justify-between text-sm hover:bg-slate-50/50">
                        <div className="flex items-center gap-4">
                          <span className="font-extrabold text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                            REC-{String(idx + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">{s.shop_name ?? `Shop #${s.shop_id}`}</div>
                            <div className="text-xs text-slate-400 font-medium">Salesman: {s.created_by_name || "Ahmed"}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-slate-800">Rs. {Number(s.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          <div className="text-xs text-slate-400 font-bold capitalize">
                            Cash: <span className="text-emerald-600 font-extrabold">Rs. {s.income_received}</span> | Loan: <span className="text-rose-500 font-extrabold">Rs. {s.loan}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center border border-dashed rounded-3xl text-slate-400 bg-slate-50/50">
                <div className="text-3xl mb-3">📭</div>
                <div className="font-bold">No sales records logged on this date.</div>
                <div className="text-xs text-slate-400 mt-1">Please select another date from the calendar to generate report summaries.</div>
              </div>
            )
          ) : (
            <div className="p-12 text-center border border-dashed rounded-3xl text-slate-400 bg-slate-50/50">
              <div className="text-3xl mb-3">📅</div>
              <div className="font-bold">Select a date from the picker above</div>
              <div className="text-xs text-slate-400 mt-1">Select a specific date to view preview logs, print report summaries, or generate spreadsheets.</div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 0; }
          body { margin: 1.5cm; }
          body * {
            visibility: hidden;
          }
          .print-section, .print-section * {
            visibility: visible;
          }
          .print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background-color: white !important;
          }
        }
      `}</style>
    </div>
  );
}
