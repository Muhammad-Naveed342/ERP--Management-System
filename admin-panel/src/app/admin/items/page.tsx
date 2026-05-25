"use client";

import { apiBase, apiJson, getToken } from "@/lib/api";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type Company = {
  id: number;
  name: string;
};

type Item = {
  id: number;
  item_name: string;
  price: number; 
  price_per_item?: number;
  quantity: number;
  company_id?: number;
  company_name?: string;
  image_url?: string;
};

export default function ItemsAdmin() {
  const [activeTab, setActiveTab] = useState<"products" | "companies">("products");

  // Items State
  const [items, setItems] = useState<Item[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemCompanyId, setItemCompanyId] = useState<string>("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemPrice, setItemPrice] = useState<string>("");
  const [itemPricePerItem, setItemPricePerItem] = useState<string>("");
  const [itemQuantity, setItemQuantity] = useState<string>("0");

  // Companies State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyName, setCompanyName] = useState("");

  // Upload States
  const [uploading, setUploading] = useState(false);

  // Lightbox State for Big Image Preview
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Editing State
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
  const [editingCompanyName, setEditingCompanyName] = useState("");

  // Filters & General State
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<number | "all">("all");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Load both items and companies
  async function loadData() {
    setErr("");
    try {
      const fetchedCompanies = await apiJson<Company[]>("/companies/");
      setCompanies(fetchedCompanies);

      // Load items with current filter
      let itemsUrl = "/items/";
      if (selectedCompanyFilter !== "all") {
        itemsUrl = `/items/?company_id=${selectedCompanyFilter}`;
      }
      const fetchedItems = await apiJson<Item[]>(itemsUrl);
      setItems(fetchedItems);
    } catch (e: unknown) {
      setErr(String(e instanceof Error ? e.message : e));
    }
  }

  // Reload data whenever filter changes
  useEffect(() => {
    loadData();
  }, [selectedCompanyFilter]);

  // Handle Image Upload to backend
  async function onImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = getToken();
      const res = await fetch(`${apiBase()}/items/upload`, {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to upload product image.");
      }

      const data = await res.json();
      setItemImageUrl(data.image_url);
    } catch (e: unknown) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setUploading(false);
    }
  }

  // Create Product 
  async function onCreateProduct(e: FormEvent) {
    e.preventDefault();
    if (!itemName.trim() || !itemPrice) {
      setErr("Product name and Price are required.");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      await apiJson("/items/", {
        method: "POST",
        body: JSON.stringify({
          item_name: itemName.trim(),
          price: parseFloat(itemPrice) || 0,
          price_per_item: itemPricePerItem ? parseFloat(itemPricePerItem) : null,
          company_id: itemCompanyId ? parseInt(itemCompanyId) : null,
          image_url: itemImageUrl || null,
          quantity: parseInt(itemQuantity) || 0,
        }),
      });

      // Clear input fields
      setItemName("");
      setItemImageUrl("");
      setItemPrice("");
      setItemPricePerItem("");
      setItemQuantity("0");
      setItemCompanyId("");
      await loadData();
    } catch (e: unknown) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  // Delete Product
  async function removeProduct(id: number) {
    if (!confirm("Are you sure you want to remove this product from the catalog?")) return;
    setErr("");
    try {
      await apiJson(`/items/${id}`, { method: "DELETE" });
      await loadData();
    } catch (e: unknown) {
      setErr(String(e instanceof Error ? e.message : e));
    }
  }

  // Create Company
  async function onCreateCompany(e: FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setErr("");
    setLoading(true);
    try {
      const newCompany = await apiJson<Company>("/companies/", {
        method: "POST",
        body: JSON.stringify({ name: companyName.trim() }),
      });
      setCompanyName("");
      setItemCompanyId(String(newCompany.id)); // Auto-select created company
      await loadData();
    } catch (e: unknown) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  // Update Company
  async function onUpdateCompany(id: number) {
    if (!editingCompanyName.trim()) return;
    setErr("");
    try {
      await apiJson(`/companies/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editingCompanyName.trim() }),
      });
      setEditingCompanyId(null);
      setEditingCompanyName("");
      await loadData();
    } catch (e: unknown) {
      setErr(String(e instanceof Error ? e.message : e));
    }
  }

  // Delete Company
  async function removeCompany(id: number, name: string) {
    if (!confirm(`Are you sure you want to delete company "${name}"? This will delete all products under this company.`)) return;
    setErr("");
    try {
      await apiJson(`/companies/${id}`, { method: "DELETE" });
      if (selectedCompanyFilter === id) {
        setSelectedCompanyFilter("all");
      }
      if (parseInt(itemCompanyId) === id) {
        setItemCompanyId("");
      }
      await loadData();
    } catch (e: unknown) {
      setErr(String(e instanceof Error ? e.message : e));
    }
  }

  // Helper to build full image URL from backend static path
  function getFullImageUrl(urlPath: string | undefined): string {
    if (!urlPath) return "";
    const base = apiBase().replace("/api/v1", "");
    return `${base}${urlPath}`;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Product Catalog</h1>
          <p className="text-slate-500 font-medium">Manage distribution items, stock quantities, and link optional companies.</p>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center self-start md:self-center shadow-inner border border-slate-200/50">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "products"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab("companies")}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "companies"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Company Manager
          </button>
        </div>
      </div>

      {/* Error notification */}
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-3xl text-sm font-semibold flex items-center gap-3 shadow-sm animate-shake">
          <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {err}
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === "products" && (
        <div className="space-y-8">

          {/* Company Filter Bar */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Filter by Company</label>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setSelectedCompanyFilter("all")}
                className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all ${selectedCompanyFilter === "all"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                  }`}
              >
                All Companies
              </button>
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCompanyFilter(c.id)}
                  className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all ${selectedCompanyFilter === c.id
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                    }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Creation Form */}
          <form
            onSubmit={onCreateProduct}
            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6"
          >
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Add New Product</h2>
              <p className="text-slate-500 text-xs mt-0.5">Define name, optional company, simple price, quantity, and upload an image.</p>
            </div>

            {/* Row 1: Name, Company, and Image Upload */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Product Name</label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                  placeholder="e.g. Diet Cola 350ml"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />
              </div>

              {/* Company selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Company (Optional)</label>
                <div className="relative">
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold appearance-none pr-10"
                    value={itemCompanyId}
                    onChange={(e) => setItemCompanyId(e.target.value)}
                  >
                    <option value="">No Company / General</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
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

              {/* Image Upload Zone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Product Image (Optional)</label>
                <div className="relative h-14 bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-4 justify-between overflow-hidden">
                  {uploading ? (
                    <span className="text-slate-400 text-xs font-bold animate-pulse">Uploading image...</span>
                  ) : itemImageUrl ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {/* Tiny thumbnail */}
                        <button
                          type="button"
                          onClick={() => setLightboxImage(itemImageUrl)}
                          className="hover:scale-105 transition-transform"
                          title="Click to view large"
                        >
                          <img
                            src={getFullImageUrl(itemImageUrl)}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                            alt="preview"
                          />
                        </button>
                        <span className="text-slate-600 text-xs font-bold truncate max-w-[120px]">Image Uploaded</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setItemImageUrl("")}
                        className="text-red-500 hover:text-red-700 text-xs font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex items-center justify-between w-full h-full">
                      <span className="text-slate-400 text-xs font-bold">Choose File (JPG/PNG)</span>
                      <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Price, Quantity and Submit */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              
              {/* Price Per Box */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Price Per Box (Rs.)
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                  placeholder="0.00"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  inputMode="decimal"
                  required
                />
              </div>

              {/* Price per item */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Price Per Item (Opt)
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                  placeholder="0.00"
                  value={itemPricePerItem}
                  onChange={(e) => setItemPricePerItem(e.target.value)}
                  inputMode="decimal"
                />
              </div>

              {/* Purchase Quantity */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Purchase Quantity
                </label>
                <input
                  type="number"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                  placeholder="0"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                  min="0"
                  required
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  {loading ? "Adding..." : "Add Product"}
                </button>
              </div>
            </div>
          </form>

          {/* Product Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((i, idx) => {
              return (
                <div
                  key={i.id}
                  className="group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Company & SKU */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl uppercase tracking-wider">
                        {i.company_name || "General"}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">Product {idx + 1}</span>
                    </div>

                    {/* Dynamic Image Container (Enlarge Lightbox on click!) */}
                    <div className="w-full aspect-video rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-5 overflow-hidden border border-slate-100 group-hover:bg-indigo-50/50 transition-all">
                      {i.image_url ? (
                        <button
                          type="button"
                          onClick={() => setLightboxImage(i.image_url || null)}
                          className="w-full h-full flex items-center justify-center outline-none focus:outline-none"
                          title="Click to view full screen"
                        >
                          <img
                            src={getFullImageUrl(i.image_url)}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            alt={i.item_name}
                          />
                        </button>
                      ) : (
                        <svg className="w-10 h-10 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-extrabold text-slate-900 text-lg leading-tight group-hover:text-indigo-600 transition-colors">
                      {i.item_name}
                    </h3>

                    {/* Basic Info */}
                    <div className="mt-5 p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-400">Price Per Box:</span>
                        <span className="text-slate-900 font-extrabold">Rs. {Number(i.price).toFixed(2)}</span>
                      </div>
                      {i.price_per_item !== null && i.price_per_item !== undefined && (
                        <div className="flex justify-between items-center text-xs font-bold pt-1.5 border-t border-slate-200/50 mt-1">
                          <span className="text-slate-400">Price Per Item:</span>
                          <span className="text-slate-900 font-extrabold">Rs. {Number(i.price_per_item).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-xs font-bold pt-1.5 border-t border-slate-200/50 mt-1">
                        <span className="text-indigo-500">Purchase Quantity:</span>
                        <span className="text-indigo-600 font-extrabold">{i.quantity}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">Active</span>
                    <button
                      type="button"
                      className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                      onClick={() => removeProduct(i.id)}
                      title="Remove item"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {items.length === 0 && (
            <div className="py-24 text-center rounded-3xl border-2 border-dashed border-slate-200 bg-white">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 text-slate-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-800 text-lg">No Products Found</h3>
              <p className="text-slate-500 mt-1 max-w-sm mx-auto text-sm">
                {selectedCompanyFilter === "all"
                  ? "Your catalog is empty. Fill out the form above to add your first product!"
                  : "No products exist under this company filter yet."
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* COMPANIES TAB */}
      {activeTab === "companies" && (
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Create Company Form */}
          <div className="lg:col-span-1">
            <form
              onSubmit={onCreateCompany}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add New Company</h2>
                <p className="text-slate-500 text-xs mt-1">Register optional companies to structure your product catalogs.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Company Name</label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                  placeholder="e.g. Nestle"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                {loading ? "Adding..." : "Add Company"}
              </button>
            </form>
          </div>

          {/* Companies List & Operations */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900">Registered Companies</h3>
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl">
                  {companies.length} Total
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {companies.map((c, idx) => (
                  <div key={c.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex-1 mr-4">
                      {editingCompanyId === c.id ? (
                        <div className="flex items-center gap-2 max-w-md">
                          <input
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                            value={editingCompanyName}
                            onChange={(e) => setEditingCompanyName(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateCompany(c.id)}
                            className="bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCompanyId(null)}
                            className="bg-slate-200 text-slate-600 text-xs font-bold px-3 py-2.5 rounded-xl hover:bg-slate-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{c.name}</div>
                            <div className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider mt-0.5 bg-indigo-50 px-2.5 py-1 rounded-xl w-fit">
                              Company {idx + 1}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCompanyId(c.id);
                          setEditingCompanyName(c.name);
                        }}
                        className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="Edit Company Name"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCompany(c.id, c.name)}
                        className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors"
                        title="Delete Company"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {companies.length === 0 && (
                  <div className="p-16 text-center italic text-slate-400 font-medium">
                    No companies created yet. You can create products without them, or register companies here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Glassmorphism Full Screen Photo Lightbox Popup */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3.5 rounded-full transition-all"
            onClick={() => setLightboxImage(null)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={getFullImageUrl(lightboxImage)}
            className="max-w-full max-h-[85vh] rounded-3xl object-contain shadow-2xl border border-white/10 select-none pointer-events-none animate-in zoom-in duration-300"
            alt="Enlarged catalog preview"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
