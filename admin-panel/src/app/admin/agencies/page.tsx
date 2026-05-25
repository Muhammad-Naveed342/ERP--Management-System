"use client";

import { useEffect, useState, useRef } from "react";
import { apiJson } from "@/lib/api";

type Agency = {
  id: number;
  name: string;
  contact: string | null;
  created_at: string;
};

type PurchaseItem = {
  id?: number;
  item_name: string;
  quantity: number;
  unit_type: string;
  unit_price: number;
  total_price: number;
};

type Purchase = {
  id: number;
  agency_id: number;
  total_amount: number;
  purchase_date: string;
  created_at: string;
  items: PurchaseItem[];
  agency?: Agency;
};

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activeTab, setActiveTab] = useState<"agencies" | "new_purchase" | "invoices">("agencies");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // New Agency Form
  const [newAgencyName, setNewAgencyName] = useState("");
  const [newAgencyContact, setNewAgencyContact] = useState("");

  // New Purchase Form
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | "">("");
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [itemNameInput, setItemNameInput] = useState("");
  const [itemQtyInput, setItemQtyInput] = useState("");
  const [itemUnitInput, setItemUnitInput] = useState("carton");
  const [itemPriceInput, setItemPriceInput] = useState("");

  // Invoice Printing
  const [printingInvoice, setPrintingInvoice] = useState<Purchase | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setErr("");
    try {
      const ags = await apiJson<Agency[]>("/agencies/");
      setAgencies(ags);
      
      // Fetch all purchases for all agencies (Normally we might want to paginate, but for MVP it's okay)
      const allPurchases: Purchase[] = [];
      for (const a of ags) {
        const ps = await apiJson<Purchase[]>(`/agencies/${a.id}/purchases`);
        for (const p of ps) {
          p.agency = a; // Attach agency details for invoice
          allPurchases.push(p);
        }
      }
      
      // Sort purchases by date descending
      allPurchases.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());
      setPurchases(allPurchases);
    } catch (e: any) {
      setErr(e.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgencyName) return;
    try {
      const ag = await apiJson<Agency>("/agencies/", {
        method: "POST",
        body: JSON.stringify({ name: newAgencyName, contact: newAgencyContact || null })
      });
      setAgencies([...agencies, ag]);
      setNewAgencyName("");
      setNewAgencyContact("");
      alert("Agency added successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to add agency");
    }
  };

  const handleDeleteAgency = async (id: number) => {
    if (!confirm("Are you sure? This will delete the agency and ALL associated purchase records!")) return;
    try {
      await apiJson(`/agencies/${id}`, { method: "DELETE" });
      setAgencies(agencies.filter(a => a.id !== id));
      setPurchases(purchases.filter(p => p.agency_id !== id));
    } catch (e: any) {
      alert(e.message || "Failed to delete agency");
    }
  };

  const handleAddPurchaseItem = () => {
    if (!itemNameInput || !itemQtyInput || !itemPriceInput) return;
    const qty = parseInt(itemQtyInput);
    const price = parseFloat(itemPriceInput);
    if (qty <= 0 || price <= 0) return alert("Invalid quantity or price");

    const newItem: PurchaseItem = {
      item_name: itemNameInput,
      quantity: qty,
      unit_type: itemUnitInput,
      unit_price: price,
      total_price: qty * price
    };

    setPurchaseItems([...purchaseItems, newItem]);
    setItemNameInput("");
    setItemQtyInput("");
    setItemPriceInput("");
  };

  const handleRemovePurchaseItem = (index: number) => {
    const newItems = [...purchaseItems];
    newItems.splice(index, 1);
    setPurchaseItems(newItems);
  };

  const handleRecordPurchase = async () => {
    if (!selectedAgencyId) return alert("Select an agency first.");
    if (purchaseItems.length === 0) return alert("Add at least one item to the invoice.");

    const total_amount = purchaseItems.reduce((sum, item) => sum + item.total_price, 0);

    try {
      setLoading(true);
      const purchase = await apiJson<Purchase>("/agencies/purchases", {
        method: "POST",
        body: JSON.stringify({
          agency_id: Number(selectedAgencyId),
          total_amount,
          items: purchaseItems
        })
      });
      
      alert("Purchase recorded and Invoice generated successfully!");
      
      // Reset form
      setPurchaseItems([]);
      setSelectedAgencyId("");
      
      // Refresh to get the fully populated purchase (with IDs)
      await fetchData();
      
      // Auto-switch to invoices tab to view the new one
      setActiveTab("invoices");
    } catch (e: any) {
      alert(e.message || "Failed to record purchase");
      setLoading(false);
    }
  };

  const printInvoice = (purchase: Purchase) => {
    setPrintingInvoice(purchase);
    const originalTitle = document.title;
    document.title = "Mohammad Naveed Mostafa - Purchase Invoice";
    
    // Allow React state to update the DOM with the print section before calling print
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
        setPrintingInvoice(null);
      }, 500);
    }, 150);
  };

  if (err) return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-3xl font-bold">
      {err}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* --- INVOICE PRINT SECTION --- */}
      {printingInvoice && (
        <div className="hidden print:block font-sans text-slate-900 bg-white p-8 print-section">
          <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-indigo-900">Haider Traders</h1>
              <h2 className="text-xl font-bold text-slate-800 mt-1">Vendor Purchase Invoice</h2>
              <p className="text-xs text-slate-500 font-medium mt-2">
                Date: {new Date(printingInvoice.purchase_date).toLocaleString("en-US", { timeZone: "Asia/Karachi" })}
              </p>
            </div>
            <div className="text-right">
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl inline-block text-right">
                <div className="text-xs font-bold text-indigo-400 uppercase">Invoice No.</div>
                <div className="text-xl font-black text-indigo-700 mt-1">INV-{String(printingInvoice.id).padStart(4, "0")}</div>
              </div>
            </div>
          </div>

          <div className="mb-8 border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Agency / Supplier Details</h3>
            <p className="text-lg font-black text-slate-900">{printingInvoice.agency?.name}</p>
            {printingInvoice.agency?.contact && <p className="text-sm font-bold text-slate-600 mt-1">📞 {printingInvoice.agency.contact}</p>}
          </div>

          <table className="w-full border-collapse text-sm text-left">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-100/50 text-slate-700">
                <th className="py-3 px-4 font-bold">Item Description</th>
                <th className="py-3 px-4 font-bold text-center">Quantity</th>
                <th className="py-3 px-4 font-bold text-right">Unit Price</th>
                <th className="py-3 px-4 font-bold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {printingInvoice.items.map((item, idx) => (
                <tr key={idx} className="text-slate-700">
                  <td className="py-3 px-4 font-bold">{item.item_name}</td>
                  <td className="py-3 px-4 text-center font-extrabold text-slate-900">
                    {item.quantity} <span className="text-xs font-medium text-slate-500 capitalize">{item.unit_type}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-600">Rs. {Number(item.unit_price).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-900">Rs. {Number(item.total_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 border-t border-slate-200 pt-6 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400">Total Items: {printingInvoice.items.length}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Grand Total: </span>
              <span className="text-2xl font-black text-indigo-900 ml-2">
                Rs. {Number(printingInvoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          
          <div className="mt-20 text-center text-[11px] font-extrabold tracking-widest text-slate-300 border-t border-slate-100 pt-4 uppercase">
            Developed by Naveed Developer
          </div>
        </div>
      )}

      {/* --- MAIN WEB UI --- */}
      <div className="print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Agency Management</h1>
            <p className="mt-1 text-slate-500 font-medium">Manage suppliers, record inventory purchases, and generate invoices.</p>
          </div>
        </div>

        <div className="flex space-x-1 bg-slate-100/50 p-1.5 rounded-2xl mb-8 border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab("agencies")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === "agencies" ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            }`}
          >
            🏢 Agencies List
          </button>
          <button
            onClick={() => setActiveTab("new_purchase")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === "new_purchase" ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            }`}
          >
            📦 Record Purchase
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === "invoices" ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            }`}
          >
            🧾 Invoices & History
          </button>
        </div>

        {loading && !printingInvoice && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* AGENCIES TAB */}
        {!loading && activeTab === "agencies" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Agency Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {agencies.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">No agencies found. Add one.</td></tr>
                  ) : agencies.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-slate-900">{a.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">{a.contact || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDeleteAgency(a.id)}
                          className="text-rose-500 hover:text-rose-700 font-bold text-xs bg-rose-50 px-3 py-1.5 rounded-lg"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 h-fit">
              <h3 className="text-lg font-extrabold text-slate-900 mb-4">Add New Agency</h3>
              <form onSubmit={handleAddAgency} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Agency / Supplier Name *</label>
                  <input
                    type="text"
                    required
                    value={newAgencyName}
                    onChange={(e) => setNewAgencyName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold text-slate-900 transition-all"
                    placeholder="e.g. Nestle Dist."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Details</label>
                  <input
                    type="text"
                    value={newAgencyContact}
                    onChange={(e) => setNewAgencyContact(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold text-slate-900 transition-all"
                    placeholder="Phone or Address"
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition-all text-sm">
                  Add Agency
                </button>
              </form>
            </div>
          </div>
        )}

        {/* RECORD PURCHASE TAB */}
        {!loading && activeTab === "new_purchase" && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Select Supplier Agency</label>
              <select
                value={selectedAgencyId}
                onChange={(e) => setSelectedAgencyId(e.target.value ? Number(e.target.value) : "")}
                className="w-full md:w-1/2 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold text-slate-900 transition-all bg-white"
              >
                <option value="">-- Choose Agency --</option>
                {agencies.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-200 pt-6 mb-6">
              <h3 className="text-2xl font-black text-slate-900 mb-4">Add Items to Invoice</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Name</label>
                  <input
                    type="text"
                    value={itemNameInput}
                    onChange={(e) => setItemNameInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-base font-extrabold text-slate-900 placeholder:font-medium placeholder:text-slate-400"
                    placeholder="e.g. Juice 250ml"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={itemQtyInput}
                    onChange={(e) => setItemQtyInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-base font-extrabold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                  <select
                    value={itemUnitInput}
                    onChange={(e) => setItemUnitInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-base font-extrabold text-slate-900 bg-white"
                  >
                    <option value="carton">Carton</option>
                    <option value="piece">Piece</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs.</span>
                    <input
                      type="number"
                      min="1"
                      value={itemPriceInput}
                      onChange={(e) => setItemPriceInput(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-base font-extrabold text-slate-900"
                    />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddPurchaseItem}
                className="mt-4 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all"
              >
                + Add Item
              </button>
            </div>

            {purchaseItems.length > 0 && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden mb-6">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">Item</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-500">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-500"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm font-bold text-slate-900">{item.item_name}</td>
                        <td className="px-4 py-3 text-sm text-center font-bold text-indigo-600">{item.quantity} <span className="text-xs text-slate-500 capitalize">{item.unit_type}</span></td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-600">Rs. {item.unit_price}</td>
                        <td className="px-4 py-3 text-sm text-right font-black text-slate-900">Rs. {item.total_price}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleRemovePurchaseItem(idx)} className="text-red-500 hover:text-red-700 text-xs font-bold">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-indigo-50/50 border-t border-indigo-100">
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-right text-sm font-bold text-slate-500 uppercase tracking-wider">Grand Total:</td>
                      <td className="px-4 py-4 text-right text-lg font-black text-indigo-700">
                        Rs. {purchaseItems.reduce((sum, item) => sum + item.total_price, 0).toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <button
              onClick={handleRecordPurchase}
              disabled={purchaseItems.length === 0 || !selectedAgencyId}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Generate Invoice & Record Purchase
            </button>
          </div>
        )}

        {/* INVOICES TAB */}
        {!loading && activeTab === "invoices" && (
          <div className="space-y-6">
            {purchases.length === 0 ? (
              <div className="p-12 text-center border border-dashed rounded-3xl text-slate-400 bg-slate-50/50">
                <div className="text-3xl mb-3">🧾</div>
                <div className="font-bold">No invoices generated yet.</div>
                <div className="text-xs text-slate-400 mt-1">Record a purchase from an agency to generate an invoice.</div>
              </div>
            ) : (
              purchases.map((p) => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-black px-2.5 py-1 rounded-lg">INV-{String(p.id).padStart(4, "0")}</span>
                      <span className="font-extrabold text-slate-900 text-lg">{p.agency?.name}</span>
                    </div>
                    <div className="text-sm font-medium text-slate-500">
                      {new Date(p.purchase_date).toLocaleString("en-US", { timeZone: "Asia/Karachi" })} • {p.items?.length || 0} items
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Value</div>
                      <div className="text-xl font-black text-emerald-600">Rs. {Number(p.total_amount).toLocaleString()}</div>
                    </div>
                    <button
                      onClick={() => printInvoice(p)}
                      className="px-5 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-sm font-bold flex items-center gap-2 shadow-md transition-all"
                    >
                      🖨️ Print Invoice
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
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
