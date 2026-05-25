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
  sync_id?: string | null;
  shop_name?: string | null;
  shop_location?: string | null;
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
  sync_id?: string | null;
  shop_name?: string | null;
  shop_location?: string | null;
  item_name?: string | null;
  synced_at?: string | null;
  created_by_name?: string | null;
};

type User = {
  id: number;
  username: string;
  role: string;
};

export default function ManualReports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [orderTakers, setOrderTakers] = useState<User[]>([]);
  const [salesmen, setSalesmen] = useState<User[]>([]);
  
  // Filters State
  const [selectedDate, setSelectedDate] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [selectedTakerId, setSelectedTakerId] = useState("");
  const [selectedSalesmanId, setSelectedSalesmanId] = useState("");
  
  const [printType, setPrintType] = useState<"orders" | "sales" | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiJson<Order[]>("/orders/"),
      apiJson<Sale[]>("/sales/"),
      apiJson<User[]>("/users/")
    ])
      .then(([ordersData, salesData, usersData]) => {
        // Filter to only manual entries (those without a sync_id)
        const manualOrders = ordersData.filter((o) => !o.sync_id);
        const manualSales = salesData.filter((s) => !s.sync_id);
        setOrders(manualOrders);
        setSales(manualSales);
        
        // Filter takers and salesmen
        setOrderTakers(usersData.filter((u) => u.role === "order_taker"));
        setSalesmen(usersData.filter((u) => u.role === "sales_man"));
      })
      .catch((e) => setErr(String(e.message || e)))
      .finally(() => setLoading(false));
  }, []);

  // Filter orders by single date, customer name, and order taker
  const getFilteredOrders = () => {
    return orders.filter((o) => {
      // Customer Filter
      if (customerFilter) {
        const search = customerFilter.toLowerCase();
        const shopName = (o.shop_name || "").toLowerCase();
        const shopLocation = (o.shop_location || "").toLowerCase();
        if (!shopName.includes(search) && !shopLocation.includes(search)) {
          return false;
        }
      }
      // Single Date Filter
      const oDate = o.timestamp.substring(0, 10); // YYYY-MM-DD
      if (selectedDate && oDate !== selectedDate) return false;
      
      // Order Taker Filter
      if (selectedTakerId && o.created_by !== parseInt(selectedTakerId)) {
        return false;
      }
      
      return true;
    });
  };

  // Filter sales by single date, customer name, and salesman
  const getFilteredSales = () => {
    return sales.filter((s) => {
      // Customer Filter
      if (customerFilter) {
        const search = customerFilter.toLowerCase();
        const shopName = (s.shop_name || "").toLowerCase();
        const shopLocation = (s.shop_location || "").toLowerCase();
        if (!shopName.includes(search) && !shopLocation.includes(search)) {
          return false;
        }
      }
      // Single Date Filter
      const sDate = s.timestamp.substring(0, 10); // YYYY-MM-DD
      if (selectedDate && sDate !== selectedDate) return false;
      
      // Salesman Filter
      if (selectedSalesmanId && s.created_by !== parseInt(selectedSalesmanId)) {
        return false;
      }
      
      return true;
    });
  };

  const filteredOrders = getFilteredOrders();
  const filteredSales = getFilteredSales();

  const totalOrdersValue = filteredOrders.reduce((sum, o) => sum + Number(o.total_price), 0);
  const totalSalesValue = filteredSales.reduce((sum, s) => sum + Number(s.total_price), 0);
  const totalIncomeReceived = filteredSales.reduce((sum, s) => sum + Number(s.income_received), 0);
  const totalOutstandingLoan = filteredSales.reduce((sum, s) => sum + Number(s.loan), 0);

  // Timezone Pakistan Standard Time Custom Formatter
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
    if (filteredOrders.length === 0) return;

    const headers = [
      "Order Number",
      "Assigned Order Taker",
      "Shop Name",
      "Shop Address",
      "Product Name",
      "Quantity",
      "Unit Type",
      "Total Price (Rs.)",
      "Date Time (PKT)"
    ];

    const rows = filteredOrders.map((o, idx) => [
      `MAN-ORD-${String(idx + 1).padStart(2, "0")}`,
      o.created_by_name || "Admin",
      o.shop_name || `Shop #${o.shop_id}`,
      o.shop_location || "",
      o.item_name || `Item #${o.item_id}`,
      o.quantity,
      o.unit_type,
      o.total_price,
      formatDateTime(o.timestamp)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `manual_orders_report_${selectedDate || "all"}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSalesExcel = () => {
    if (filteredSales.length === 0) return;

    const headers = [
      "Receipt Number",
      "Assigned Salesman",
      "Shop Name",
      "Shop Address",
      "Product Name",
      "Quantity",
      "Unit Type",
      "Income Received (Rs.)",
      "Outstanding Loan (Rs.)",
      "Total Value (Rs.)",
      "Date Time (PKT)"
    ];

    const rows = filteredSales.map((s, idx) => [
      `MAN-REC-${String(idx + 1).padStart(2, "0")}`,
      s.created_by_name || "Admin",
      s.shop_name || `Shop #${s.shop_id}`,
      s.shop_location || "",
      s.item_name || `Item #${s.item_id}`,
      s.quantity,
      s.unit_type,
      s.income_received,
      s.loan,
      s.total_price,
      formatDateTime(s.timestamp)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `manual_sales_report_${selectedDate || "all"}.csv`);
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
              <h1 className="text-2xl font-black tracking-tight text-indigo-900 font-sans">Haider Traders</h1>
              <h2 className="text-xl font-bold text-slate-800 mt-1">Orders Dispatch Summary</h2>
              <p className="text-xs text-slate-400 font-medium mt-2">Generated: {new Date().toLocaleString()}</p>
            </div>
            <div className="text-right bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <div className="text-xs font-bold text-slate-400 uppercase">Selected Date</div>
              <div className="text-sm font-black text-indigo-700 mt-1 flex justify-end">
                {selectedDate || "All Dates"}
              </div>
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
              {filteredOrders.map((o, idx) => (
                <tr key={o.id} className="text-slate-700">
                  <td className="py-2.5 px-2 font-bold text-indigo-600">MAN-ORD-{String(idx + 1).padStart(2, "0")}</td>
                  <td className="py-2.5 px-2 font-bold text-slate-900">{o.created_by_name || "Admin"}</td>
                  <td className="py-2.5 px-2 font-medium">
                    <div>{o.shop_name ?? `Shop #${o.shop_id}`}</div>
                    {o.shop_location && <div className="text-xs text-slate-400">{o.shop_location}</div>}
                  </td>
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
              <span className="text-xs font-bold text-slate-400">Total Manual Orders: {filteredOrders.length}</span>
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
              <h1 className="text-2xl font-black tracking-tight text-emerald-900">Haider Traders</h1>
              <h2 className="text-xl font-bold text-slate-800 mt-1">Sales Revenue Summary</h2>
              <p className="text-xs text-slate-400 font-medium mt-2">Generated: {new Date().toLocaleString()}</p>
            </div>
            <div className="text-right bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <div className="text-xs font-bold text-slate-400 uppercase">Selected Date</div>
              <div className="text-sm font-black text-emerald-700 mt-1 flex justify-end">
                {selectedDate || "All Dates"}
              </div>
            </div>
          </div>

          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-100/50 text-slate-700">
                <th className="py-3 px-2 font-bold">Receipt No.</th>
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
              {filteredSales.map((s, idx) => (
                <tr key={s.id} className="text-slate-700">
                  <td className="py-2.5 px-2 font-bold text-emerald-600">MAN-REC-{String(idx + 1).padStart(2, "0")}</td>
                  <td className="py-2.5 px-2 font-bold text-slate-900">{s.created_by_name || "Admin"}</td>
                  <td className="py-2.5 px-2 font-medium">
                    <div>{s.shop_name ?? `Shop #${s.shop_id}`}</div>
                    {s.shop_location && <div className="text-xs text-slate-400">{s.shop_location}</div>}
                  </td>
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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Manual reporting desk</h1>
          <p className="mt-2 text-slate-500 font-medium">Generate custom reports, export manual spreadsheets or print dispatch details based on date and customer filters.</p>
        </div>

        {/* Universal Filter Desk */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          
          {/* Shop Filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block ml-1">Search Customer Name</span>
            <input
              type="text"
              placeholder="Search Shop Name or Address..."
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold"
            />
          </div>

          {/* Single Date Picker Filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Filter by Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Clear Filters Button */}
          <button
            onClick={() => {
              setSelectedDate("");
              setCustomerFilter("");
              setSelectedTakerId("");
              setSelectedSalesmanId("");
            }}
            className="w-full h-[50px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all text-sm border"
          >
            Clear Filters
          </button>
        </div>

        {/* 📦 Section 1: Manual Orders Report */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden p-8 space-y-6">
          <div className="border-b pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
                <span>📦</span> Manual Orders Dispatch Summary
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Export manual order logs or print dispatch guides.</p>
            </div>
            
            {/* Order Taker wise dropdown filter */}
            <div className="min-w-[200px] space-y-1 shrink-0">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block ml-1">Filter by Order Taker</span>
              <div className="relative">
                <select
                  value={selectedTakerId}
                  onChange={(e) => setSelectedTakerId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold appearance-none pr-10"
                >
                  <option value="">All Order Takers</option>
                  {orderTakers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.username}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {filteredOrders.length > 0 ? (
            <div className="space-y-6">
              {/* Order Metrics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50/50 p-6 rounded-2xl border">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Filtered Date</span>
                  <span className="text-sm font-extrabold text-slate-700 mt-1 block">
                    {selectedDate || "All Dates"}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Dispatched Orders</span>
                  <span className="text-sm font-extrabold text-indigo-600 mt-1 block">{filteredOrders.length} orders</span>
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
                  📥 Export manual Orders to CSV
                </button>
                <button
                  onClick={() => printReport("orders")}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-950 text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  🖨️ Print Dispatch Summary
                </button>
              </div>

              {/* Orders list preview */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="bg-slate-50 border-b px-6 py-4 font-bold text-slate-700 text-sm">
                  Manual Orders List Preview
                </div>
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto animate-in fade-in duration-300">
                  {filteredOrders.map((o, idx) => (
                    <div key={o.id} className="px-6 py-4 flex items-center justify-between text-sm hover:bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <span className="font-extrabold text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg">
                          MAN-ORD-{String(idx + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">{o.shop_name ?? `Shop #${o.shop_id}`}</div>
                          {o.shop_location && <div className="text-xs text-slate-400 mt-0.5">{o.shop_location}</div>}
                          <div className="text-xs text-slate-400 font-bold mt-0.5">Assigned Taker: <span className="text-slate-600 font-extrabold">{o.created_by_name || "Admin"}</span></div>
                          <div className="text-xs text-slate-400 font-semibold">{formatDateTime(o.timestamp)}</div>
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
              <div className="font-bold">No manual orders match these filters.</div>
              <div className="text-xs text-slate-400 mt-1">Try expanding your date range or adjusting taker/customer filters.</div>
            </div>
          )}
        </div>

        {/* 💵 Section 2: Manual Sales Report */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden p-8 space-y-6">
          <div className="border-b pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
                <span>💵</span> Manual Sales & Outstanding Loans Summary
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Trace collected payments, turn overs and outstanding customer credits.</p>
            </div>
            
            {/* Salesman dropdown filter */}
            <div className="min-w-[200px] space-y-1 shrink-0">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block ml-1">Filter by Salesman</span>
              <div className="relative">
                <select
                  value={selectedSalesmanId}
                  onChange={(e) => setSelectedSalesmanId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-semibold appearance-none pr-10"
                >
                  <option value="">All Salesmen</option>
                  {salesmen.map((sm) => (
                    <option key={sm.id} value={sm.id}>
                      {sm.username}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {filteredSales.length > 0 ? (
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
                  📥 Export manual Sales to CSV
                </button>
                <button
                  onClick={() => printReport("sales")}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-950 text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  🖨️ Print Sales Summary
                </button>
              </div>

              {/* Sales list preview */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="bg-slate-50 border-b px-6 py-4 font-bold text-slate-700 text-sm">
                  Manual Sales List Preview
                </div>
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto animate-in fade-in duration-300">
                  {filteredSales.map((s, idx) => (
                    <div key={s.id} className="px-6 py-4 flex items-center justify-between text-sm hover:bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <span className="font-extrabold text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                          MAN-REC-{String(idx + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">{s.shop_name ?? `Shop #${s.shop_id}`}</div>
                          {s.shop_location && <div className="text-xs text-slate-400 mt-0.5">{s.shop_location}</div>}
                          <div className="text-xs text-slate-400 font-bold mt-0.5">Assigned Salesman: <span className="text-slate-600 font-extrabold">{s.created_by_name || "Admin"}</span></div>
                          <div className="text-xs text-slate-400 font-semibold">{formatDateTime(s.timestamp)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-800">Rs. {Number(s.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="text-xs text-slate-400 font-bold capitalize">
                          Paid: <span className="text-emerald-600 font-extrabold">Rs. {s.income_received}</span> | Loan: <span className="text-rose-500 font-extrabold">Rs. {s.loan}</span>
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
              <div className="font-bold">No manual sales records match these filters.</div>
              <div className="text-xs text-slate-400 mt-1">Try expanding your date range or adjusting salesman/customer filters.</div>
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
