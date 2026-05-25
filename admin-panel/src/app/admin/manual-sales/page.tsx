"use client";

import { apiJson } from "@/lib/api";
import { useEffect, useState } from "react";

type Shop = {
  id: number;
  shop_name: string;
  owner_name: string;
  phone?: string;
  location?: string;
};

type User = {
  id: number;
  username: string;
  role: string;
};

type PriceType = {
  id: number;
  code: string;
  name: string;
};

type ItemPrice = {
  id: number;
  item_id: number;
  price_type_id: number;
  price: number;
};

type Item = {
  id: number;
  item_name: string;
  price: number;
  pieces_per_carton?: number;
  prices: ItemPrice[];
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

export default function ManualSales() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesmen, setSalesmen] = useState<User[]>([]);
  
  // Form State
  const [shopId, setShopId] = useState("");
  const [shopSearch, setShopSearch] = useState("");
  const [showShopDropdown, setShowShopDropdown] = useState(false);
  const [itemId, setItemId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [unitType, setUnitType] = useState("box");
  const [quantity, setQuantity] = useState("1");
  const [priceTier, setPriceTier] = useState("wholesale");
  const [incomeReceived, setIncomeReceived] = useState("");
  const [selectedSalesmanId, setSelectedSalesmanId] = useState("");
  const [isCustomIncome, setIsCustomIncome] = useState(false);
  
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setErr("");
    try {
      const [shopsData, itemsData, priceTypesData, salesData, usersData] = await Promise.all([
        apiJson<Shop[]>("/shops/"),
        apiJson<Item[]>("/items/"),
        apiJson<PriceType[]>("/price-types/"),
        apiJson<Sale[]>("/sales/"),
        apiJson<User[]>("/users/")
      ]);
      setShops(shopsData);
      setItems(itemsData);
      setPriceTypes(priceTypesData);
      
      const salesGuys = usersData.filter(u => u.role === "sales_man");
      setSalesmen(salesGuys);
      
      if (shopsData.length > 0) {
        setShopId(String(shopsData[0].id));
        setShopSearch(shopsData[0].shop_name);
      }
      if (itemsData.length > 0) {
        setItemId(String(itemsData[0].id));
        setItemSearch(itemsData[0].item_name);
      }
      if (salesGuys.length > 0) setSelectedSalesmanId(String(salesGuys[0].id));
      
      // Filter list to only show manual sales (those without a sync_id)
      const manualList = salesData.filter((s) => !s.sync_id);
      setSales(manualList);
    } catch (e: any) {
      setErr(e.message || "Failed to load data from backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Helper: Find current item and calculate estimated unit price and total value
  const getSelectedProductDetails = () => {
    if (!itemId) return null;
    const item = items.find((i) => i.id === parseInt(itemId));
    if (!item) return null;

    const baseCode = priceTier;
    const lookupCode = unitType === "carton" ? `${baseCode}_carton` : baseCode;
    const matchType = priceTypes.find((pt) => pt.code === lookupCode);
    
    let resolvedPrice = item.price;
    if (matchType) {
      const customPrice = item.prices.find((p) => p.price_type_id === matchType.id);
      if (customPrice) resolvedPrice = customPrice.price;
      else if (unitType === "carton") {
        resolvedPrice = item.price * (item.pieces_per_carton || 12);
      }
    } else if (unitType === "carton") {
      resolvedPrice = item.price * (item.pieces_per_carton || 12);
    }

    const calculatedTotal = resolvedPrice * (parseInt(quantity) || 0);

    return {
      item,
      unitPrice: resolvedPrice,
      totalPrice: calculatedTotal
    };
  };

  const details = getSelectedProductDetails();

  // Keep income received synced with calculated total unless overwritten by user
  useEffect(() => {
    if (details && !isCustomIncome) {
      setIncomeReceived(String(details.totalPrice));
    }
  }, [details, isCustomIncome]);

  const handleIncomeChange = (val: string) => {
    setIsCustomIncome(true);
    setIncomeReceived(val);
  };

  const getLoanAmount = () => {
    if (!details) return 0;
    const income = parseFloat(incomeReceived) || 0;
    const diff = details.totalPrice - income;
    return diff > 0 ? diff : 0;
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !itemId || !quantity || incomeReceived === "" || !selectedSalesmanId) {
      setErr("Please fill in all fields.");
      return;
    }
    
    setErr("");
    setMsg("");
    setSubmitting(true);
    
    try {
      const incomeVal = parseFloat(incomeReceived) || 0;
      const loanVal = getLoanAmount();

      await apiJson("/sales/", {
        method: "POST",
        body: JSON.stringify({
          shop_id: parseInt(shopId),
          item_id: parseInt(itemId),
          quantity: parseInt(quantity),
          unit_type: unitType,
          price_tier: priceTier,
          income_received: incomeVal,
          loan: loanVal,
          created_by: parseInt(selectedSalesmanId)
        }),
      });

      setMsg("Manual sale registered successfully!");
      setQuantity("1");
      setIsCustomIncome(false);
      
      // Reload sales history
      const salesData = await apiJson<Sale[]>("/sales/");
      const manualList = salesData.filter((s) => !s.sync_id);
      setSales(manualList);
      
      setTimeout(() => setMsg(""), 3000);
    } catch (e: any) {
      setErr(e.message || "Failed to register manual sale.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSingleSale = async (id: number) => {
    if (!confirm(`Are you sure you want to permanently delete sale record #${id}?`)) return;
    try {
      setLoading(true);
      await apiJson(`/sales/${id}`, { method: "DELETE" });
      setSales(sales.filter((s) => s.id !== id));
      setMsg("Sale record deleted successfully.");
      setTimeout(() => setMsg(""), 3000);
    } catch (e: any) {
      alert(e.message || "Failed to delete sale.");
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

  if (loading && shops.length === 0) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>💵</span> Manual Sales Workspace
        </h1>
        <p className="text-slate-500 font-medium">Phase 2: Directly record sales, collect revenues, and monitor customer credits (loans) from admin panel.</p>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-3xl text-sm font-semibold flex items-center gap-3 shadow-sm animate-shake">
          <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {err}
        </div>
      )}

      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-3xl text-sm font-semibold flex items-center gap-3 shadow-sm animate-fade-in">
          <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleCreateSale} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 sticky top-24">
            <div>
              <h2 className="text-xl font-bold text-slate-900 text-emerald-950">Record Manual Sale</h2>
              <p className="text-slate-500 text-xs mt-1">Directly record sales transactions, payments collected and outstanding credits.</p>
            </div>

            {/* Shop selection (Searchable) */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Customer / Shop Name & Address</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-semibold"
                  placeholder="Search by shop name or address..."
                  value={shopSearch}
                  onFocus={() => setShowShopDropdown(true)}
                  onBlur={() => setTimeout(() => setShowShopDropdown(false), 200)}
                  onChange={(e) => {
                    setShopSearch(e.target.value);
                    setShopId("");
                    setShowShopDropdown(true);
                  }}
                  required
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {showShopDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-72 overflow-y-auto">
                  {shops.filter((s) =>
                    s.shop_name.toLowerCase().includes(shopSearch.toLowerCase()) ||
                    (s.owner_name && s.owner_name.toLowerCase().includes(shopSearch.toLowerCase())) ||
                    (s.location && s.location.toLowerCase().includes(shopSearch.toLowerCase()))
                  ).length > 0 ? (
                    shops.filter((s) =>
                      s.shop_name.toLowerCase().includes(shopSearch.toLowerCase()) ||
                      (s.owner_name && s.owner_name.toLowerCase().includes(shopSearch.toLowerCase())) ||
                      (s.location && s.location.toLowerCase().includes(shopSearch.toLowerCase()))
                    ).map((s) => (
                      <div
                        key={s.id}
                        className="px-4 py-3 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0"
                        onClick={() => {
                          setShopId(String(s.id));
                          setShopSearch(s.shop_name);
                          setShowShopDropdown(false);
                        }}
                      >
                        <div className="font-bold text-slate-900">{s.shop_name}</div>
                        {s.location ? (
                        <div className="text-xs text-slate-500 mt-0.5 truncate max-w-full">{s.location}</div>
                      ) : (
                        s.owner_name && <div className="text-xs text-slate-500 mt-0.5">{s.owner_name}</div>
                      )}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500 italic">No shops found matching "{shopSearch}"</div>
                  )}
                </div>
              )}
              {shopId && shops.find((s) => String(s.id) === shopId)?.location && (
                <div className="mt-3 bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Selected Shop Address</div>
                    <div className="text-sm font-semibold text-slate-800">{shops.find((s) => String(s.id) === shopId)?.location}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Salesman selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Salesman Name</label>
              <div className="relative">
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-semibold appearance-none pr-10"
                  value={selectedSalesmanId}
                  onChange={(e) => setSelectedSalesmanId(e.target.value)}
                  required
                >
                  {salesmen.map((sm) => (
                    <option key={sm.id} value={sm.id}>
                      {sm.username}
                    </option>
                  ))}
                  {salesmen.length === 0 && (
                    <option value="" disabled>No salesmen found</option>
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Item selection (Searchable) */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Select Product / Item</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-semibold"
                  placeholder="Search and select a product..."
                  value={itemSearch}
                  onFocus={() => setShowItemDropdown(true)}
                  onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setItemId("");
                    setShowItemDropdown(true);
                  }}
                  required
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {showItemDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-72 overflow-y-auto">
                  {items.filter((i) => i.item_name.toLowerCase().includes(itemSearch.toLowerCase())).length > 0 ? (
                    items.filter((i) => i.item_name.toLowerCase().includes(itemSearch.toLowerCase())).map((i) => (
                      <div
                        key={i.id}
                        className="px-4 py-3 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0"
                        onClick={() => {
                          setItemId(String(i.id));
                          setItemSearch(i.item_name);
                          setShowItemDropdown(false);
                        }}
                      >
                        <div className="font-bold text-slate-900">{i.item_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Base Price: Rs. {Number(i.price).toFixed(2)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500 italic">No products found matching "{itemSearch}"</div>
                  )}
                </div>
              )}
            </div>

            {/* Pricing Tier (wholesale/retail) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Price List / Tier</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border">
                <button
                  type="button"
                  onClick={() => setPriceTier("wholesale")}
                  className={`py-2 rounded-xl font-bold text-xs transition-all ${
                    priceTier === "wholesale" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Wholesale Price
                </button>
                <button
                  type="button"
                  onClick={() => setPriceTier("retail")}
                  className={`py-2 rounded-xl font-bold text-xs transition-all ${
                    priceTier === "retail" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Retail Price
                </button>
              </div>
            </div>

            {/* Unit Type & Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Unit Type</label>
                <div className="relative">
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-semibold appearance-none pr-10"
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                  >
                    <option value="box">Box</option>
                    <option value="piece">Piece</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-semibold"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Income Received & Loan Calculator */}
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Income Received (Rs)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-semibold"
                  value={incomeReceived}
                  onChange={(e) => handleIncomeChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Outstanding Loan (Rs)</label>
                <div className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3.5 text-slate-700 font-extrabold text-sm select-none">
                  Rs. {getLoanAmount().toFixed(2)}
                </div>
              </div>
            </div>

            {/* Price Preview Panel */}
            {details && (
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-400">Unit Rate:</span>
                  <span className="text-slate-800 font-extrabold">Rs. {Number(details.unitPrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold border-t border-emerald-100/50 pt-2">
                  <span className="text-emerald-600 font-extrabold">Total Sales Price:</span>
                  <span className="text-emerald-900 font-black text-base">Rs. {Number(details.totalPrice).toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || shops.length === 0 || items.length === 0 || salesmen.length === 0}
              className="w-full h-14 rounded-2xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:shadow-emerald-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              {submitting ? "Processing..." : "Record Manual Sale"}
            </button>
          </form>
        </div>

        {/* Manual Sales Logs Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Manual Sales Log</h3>
                <p className="text-xs text-slate-400 font-medium">History of manual transactions generated directly inside the system desk.</p>
              </div>
              <span className="text-xs font-bold bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl">
                {sales.length} manual sales
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Receipt No</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Salesman</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Shop Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Product Info</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Loan Balance</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total Value</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {sales.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50/60 px-3 py-1.5 rounded-xl tracking-wider">
                          MAN-REC-{String(idx + 1).padStart(2, "0")}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            👤
                          </div>
                          <span className="text-sm font-bold text-slate-800">{s.created_by_name || "Admin"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900">{s.shop_name ?? `Shop #${s.shop_id}`}</div>
                        {s.shop_location && (
                          <div className="text-[11px] text-slate-400 mt-0.5 max-w-[220px] truncate" title={s.shop_location}>
                            {s.shop_location}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600 font-semibold">
                        {s.item_name ?? `Item #${s.item_id}`}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                          {s.quantity} {s.unit_type === 'box' ? 'Box(es)' : 'Piece(s)'}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-bold text-emerald-600">+Rs. {Number(s.income_received).toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className={`text-sm font-bold ${s.loan > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                          Rs. {Number(s.loan).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-slate-900">
                        Rs. {Number(s.total_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-slate-500">
                        {formatDateTime(s.timestamp)}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => deleteSingleSale(s.id)}
                          className="text-rose-600 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 p-2 rounded-xl transition-colors"
                          title="Delete Record"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-6 py-16 text-center text-slate-400 italic font-medium">
                        No manual sales registered yet. Complete the form to record your first sale.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
