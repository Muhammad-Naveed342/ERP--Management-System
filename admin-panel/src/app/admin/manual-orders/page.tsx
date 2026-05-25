"use client";

import { apiJson } from "@/lib/api";
import { useEffect, useState } from "react";

type Shop = {
  id: number;
  shop_name: string;
  location?: string;
  mobile_phone?: string;
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

type Order = {
  id: number;
  shop_id: number;
  item_id: number;
  quantity: number;
  total_price: number;
  unit_price?: number;
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

export default function ManualOrders() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderTakers, setOrderTakers] = useState<User[]>([]);

  // Form State
  const [shopId, setShopId] = useState("");
  const [shopSearch, setShopSearch] = useState("");
  const [showShopDropdown, setShowShopDropdown] = useState(false);
  const [itemId, setItemId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [unitType, setUnitType] = useState("box");
  const [quantity, setQuantity] = useState("1");
  const [priceTier, setPriceTier] = useState("retail");
  const [unitPrice, setUnitPrice] = useState("");
  const [isCustomPrice, setIsCustomPrice] = useState(false);
  const [selectedTakerId, setSelectedTakerId] = useState("");

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setErr("");
    try {
      const [shopsData, itemsData, priceTypesData, ordersData, usersData] = await Promise.all([
        apiJson<Shop[]>("/shops/"),
        apiJson<Item[]>("/items/"),
        apiJson<PriceType[]>("/price-types/"),
        apiJson<Order[]>("/orders/"),
        apiJson<User[]>("/users/")
      ]);
      setShops(shopsData);
      setItems(itemsData);
      setPriceTypes(priceTypesData);

      const takers = usersData.filter(u => u.role === "order_taker");
      setOrderTakers(takers);

      // Select defaults if available
      if (shopsData.length > 0) {
        setShopId(String(shopsData[0].id));
        setShopSearch(shopsData[0].shop_name);
      }
      if (itemsData.length > 0) {
        setItemId(String(itemsData[0].id));
        setItemSearch(itemsData[0].item_name);
      }
      if (takers.length > 0) setSelectedTakerId(String(takers[0].id));

      // Filter list to only show manual orders (those without a sync_id)
      const manualList = ordersData.filter((o) => !o.sync_id);
      setOrders(manualList);
    } catch (e: any) {
      setErr(e.message || "Failed to load data from backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Helper: Find current item and calculate estimated unit price
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

    return {
      item,
      unitPrice: resolvedPrice,
      totalPrice: resolvedPrice * (parseInt(quantity) || 0)
    };
  };

  const details = getSelectedProductDetails();

  useEffect(() => {
    if (details && !isCustomPrice) {
      setUnitPrice(String(details.unitPrice));
    }
  }, [details, isCustomPrice]);

  const handleUnitPriceChange = (val: string) => {
    setIsCustomPrice(true);
    setUnitPrice(val);
  };

  const getTotalValue = () => {
    const price = parseFloat(unitPrice) || 0;
    return price * (parseInt(quantity) || 0);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !itemId || !quantity || !selectedTakerId || unitPrice === "") {
      setErr("Please fill in all fields, including the item price.");
      return;
    }

    setErr("");
    setMsg("");
    setSubmitting(true);

    try {
      await apiJson<Order>("/orders/", {
        method: "POST",
        body: JSON.stringify({
          shop_id: parseInt(shopId),
          item_id: parseInt(itemId),
          quantity: parseInt(quantity),
          unit_type: unitType,
          price_tier: priceTier,
          unit_price: parseFloat(unitPrice) || 0,
          created_by: parseInt(selectedTakerId)
        }),
      });

      setMsg("Manual order created successfully!");
      setQuantity("1");
      setIsCustomPrice(false);

      // Reload order history
      const ordersData = await apiJson<Order[]>("/orders/");
      const manualList = ordersData.filter((o) => !o.sync_id);
      setOrders(manualList);

      setTimeout(() => setMsg(""), 3000);
    } catch (e: any) {
      setErr(e.message || "Failed to create manual order.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSingleOrder = async (id: number) => {
    if (!confirm(`Are you sure you want to permanently delete order #${id}?`)) return;
    try {
      setLoading(true);
      await apiJson(`/orders/${id}`, { method: "DELETE" });
      setOrders(orders.filter((o) => o.id !== id));
      setMsg("Order deleted successfully.");
      setTimeout(() => setMsg(""), 3000);
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

  if (loading && shops.length === 0) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>📦</span> Manual Order System
        </h1>
        <p className="text-slate-500 font-medium">Phase 2: Manually register distribution orders on behalf of shops in real time.</p>
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
          <form onSubmit={handleCreateOrder} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 sticky top-24">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Create Order Entry</h2>
              <p className="text-slate-500 text-xs mt-1">Specify customer, assigned order taker, product details and quantities.</p>
            </div>

            {/* Shop selection (Searchable) */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Customer / Shop Name</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold"
                  placeholder="Search and select a shop..."
                  value={shopSearch}
                  onFocus={() => setShowShopDropdown(true)}
                  onBlur={() => setTimeout(() => setShowShopDropdown(false), 200)}
                  onChange={(e) => {
                    setShopSearch(e.target.value);
                    setShopId(""); // clear selected id if they change text manually
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

              {/* Dropdown list */}
              {showShopDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                  {shops.filter(s => s.shop_name.toLowerCase().includes(shopSearch.toLowerCase())).length > 0 ? (
                    shops.filter(s => s.shop_name.toLowerCase().includes(shopSearch.toLowerCase())).map((s) => (
                      <div
                        key={s.id}
                        className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0"
                        onClick={() => {
                          setShopId(String(s.id));
                          setShopSearch(s.shop_name);
                          setShowShopDropdown(false);
                        }}
                      >
                        <div className="font-bold text-slate-900">{s.shop_name}</div>
                        {s.location && <div className="text-xs text-slate-500 mt-0.5">{s.location}</div>}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500 italic">No shops found matching "{shopSearch}"</div>
                  )}
                </div>
              )}

              {/* Selected Shop Address Attachment */}
              {shopId && shops.find(s => String(s.id) === shopId)?.location && (
                <div className="mt-2 bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </span>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Attached Shop Address</div>
                    <div className="text-sm font-semibold text-slate-800">{shops.find(s => String(s.id) === shopId)?.location}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Order Taker selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Order Taker Name</label>
              <div className="relative">
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold appearance-none pr-10"
                  value={selectedTakerId}
                  onChange={(e) => setSelectedTakerId(e.target.value)}
                  required
                >
                  {orderTakers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.username}
                    </option>
                  ))}
                  {orderTakers.length === 0 && (
                    <option value="" disabled>No order takers found</option>
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold"
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

              {/* Dropdown list */}
              {showItemDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                  {items.filter(i => i.item_name.toLowerCase().includes(itemSearch.toLowerCase())).length > 0 ? (
                    items.filter(i => i.item_name.toLowerCase().includes(itemSearch.toLowerCase())).map((i) => (
                      <div
                        key={i.id}
                        className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0"
                        onClick={() => {
                          setItemId(String(i.id));
                          setItemSearch(i.item_name);
                          setShowItemDropdown(false);
                        }}
                      >
                        <div className="font-bold text-slate-900">{i.item_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Base Price: Rs. {i.price.toFixed(2)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500 italic">No products found matching "{itemSearch}"</div>
                  )}
                </div>
              )}
            </div>

            {/* Pricing Tier (retail/wholesale) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Price List / Tier</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border">
                <button
                  type="button"
                  onClick={() => setPriceTier("retail")}
                  className={`py-2 rounded-xl font-bold text-xs transition-all ${priceTier === "retail" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  Retail Price
                </button>
                <button
                  type="button"
                  onClick={() => setPriceTier("wholesale")}
                  className={`py-2 rounded-xl font-bold text-xs transition-all ${priceTier === "wholesale" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  Wholesale Price
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Unit Price (Rs)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold"
                value={unitPrice}
                onChange={(e) => handleUnitPriceChange(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Unit Type</label>
                <div className="relative">
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold appearance-none pr-10"
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Price Preview Panel */}
            {details && (
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-400">Unit Rate:</span>
                  <span className="text-slate-800 font-extrabold">Rs. {Number(parseFloat(unitPrice) || details.unitPrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold border-t border-indigo-100/50 pt-2">
                  <span className="text-indigo-600 font-extrabold">Total Price:</span>
                  <span className="text-indigo-900 font-black text-base">Rs. {Number(getTotalValue()).toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || shops.length === 0 || items.length === 0 || orderTakers.length === 0}
              className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              {submitting ? "Creating..." : "Add Manual Order"}
            </button>
          </form>
        </div>

        {/* Manual Orders Logs Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Manual Order History</h3>
                <p className="text-xs text-slate-400 font-medium">Logged order sheets processed manually via admin workspace.</p>
              </div>
              <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl">
                {orders.length} manual entries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Order No</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Order Taker</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Shop & Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Product Info</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Total Value</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {orders.map((o, idx) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50/60 px-3 py-1.5 rounded-xl tracking-wider">
                          MAN-ORD-{String(idx + 1).padStart(2, "0")}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            👤
                          </div>
                          <span className="text-sm font-bold text-slate-800">{o.created_by_name || "Admin"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                            {o.shop_name?.substring(0, 1) || "S"}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{o.shop_name ?? `Shop #${o.shop_id}`}</div>
                            {o.shop_location && <div className="text-[11px] text-slate-400 mt-0.5 max-w-[200px] truncate" title={o.shop_location}>{o.shop_location}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-slate-600">
                        {o.item_name ?? `Item #${o.item_id}`}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                          {o.quantity} {o.unit_type === 'box' ? 'Box(es)' : 'Piece(s)'}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-black text-slate-900">Rs. {Number(o.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-slate-500">
                        {formatDateTime(o.timestamp)}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => deleteSingleOrder(o.id)}
                          className="text-rose-600 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 p-2 rounded-xl transition-colors"
                          title="Delete Order"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-slate-400 italic font-medium">
                        No manual orders logged yet. Complete the form to record your first entry.
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
