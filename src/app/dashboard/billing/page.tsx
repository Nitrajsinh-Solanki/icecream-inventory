// src/app/dashboard/billing/page.tsx


"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";

type Customer = { _id: string; name: string; contact?: string; address?: string };
type Product = { _id: string; name: string; unit?: string; sellingPrice?: number; price?: number };
type SellerDetails = {
  sellerName?: string;
  gstNumber?: string;
  fullAddress?: string;
  contact?: string;
  slogan?: string;
  logoUrl?: string;
  qrCodeUrl?: string;
  signatureUrl?: string;
  // optional bank fields (sometimes stored in seller-details)
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankingName?: string;
};
type BankDetails = {
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankingName?: string;
};

type BillItem = {
  productName: string;
  quantity: number;
  unit: string;
  price: number; // always numeric
  total: number; // always numeric (0 if free)
  free: boolean;
};

export default function BillingPage() {
  // seller + bank
  const [seller, setSeller] = useState<SellerDetails | null>(null);
  const [bank, setBank] = useState<BankDetails | null>(null);

  // customers & products
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // billing/shipping customer selection
  const [billingCustomer, setBillingCustomer] = useState<Customer | null>(null);
  const [shippingCustomer, setShippingCustomer] = useState<Customer | null>(null);
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [customerInput, setCustomerInput] = useState<string>(""); // text in the input

  // bill meta
  const [serialNo, setSerialNo] = useState<string>("");
  const [date, setDate] = useState<string>("");

  // fixed line (editable)
  const [fixedLine, setFixedLine] = useState<string>(
    "composition taxable person not eligible to collect taxes on supplies"
  );

  // items (start with 15 blank lines)
  const blankItem = (): BillItem => ({
    productName: "",
    quantity: 1,
    unit: "",
    price: 0,
    total: 0,
    free: false,
  });
  const [items, setItems] = useState<BillItem[]>(Array.from({ length: 15 }, blankItem));

  // discount & remarks
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>("");

  // ===== Helpers to fetch and normalize API responses =====
  const safeJson = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  // load seller, customers, products, bank details and set serial/date
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      toast.error("User not found in localStorage");
      return;
    }
    const parsed = JSON.parse(stored);
    const userId = parsed._id;

    // Seller details (may include bank fields)
    fetch(`/api/seller-details?userId=${encodeURIComponent(userId)}`)
      .then((r) => safeJson(r))
      .then((s) => {
        if (s && !s.error) {
          setSeller(s);
          // If seller doc also contains bank fields, pick them
          const possibleBank: BankDetails = {
            bankName: (s as any).bankName ?? (s as any).bank ?? undefined,
            branchName: (s as any).branchName ?? undefined,
            accountNumber: (s as any).accountNo ?? (s as any).accountNumber ?? undefined,
            ifscCode: (s as any).ifscCode ?? undefined,
            bankingName: (s as any).bankingName ?? undefined,
          };
          // if at least one bank field present, use it
          if (possibleBank.bankName || possibleBank.accountNumber || possibleBank.ifscCode) {
            setBank(possibleBank);
          }
        }
      })
      .catch(() => {});

    // Bank details endpoint fallback (if separate)
    fetch(`/api/bank-details?sellerId=${encodeURIComponent(userId)}`)
      .then((r) => safeJson(r))
      .then((b) => {
        if (b && !b.error) {
          // Accept either an object or array
          const bankObj: BankDetails = Array.isArray(b) ? b[0] ?? null : b;
          if (bankObj) setBank(bankObj);
        }
      })
      .catch(() => {});

    // customers (API may return array or { customers: [...] })
    fetch(`/api/customers?userId=${encodeURIComponent(userId)}`)
      .then((r) => safeJson(r))
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data)) {
          setCustomers(data as Customer[]);
        } else if (Array.isArray((data as any).customers)) {
          setCustomers((data as any).customers as Customer[]);
        } else if ((data as any).items && Array.isArray((data as any).items)) {
          setCustomers((data as any).items as Customer[]);
        } else {
          // try to collect top-level fields (fallback)
          const arr = Object.values(data).filter((v) => Array.isArray(v)).flat();
          if (arr.length) setCustomers(arr[0] as Customer[]);
        }
      })
      .catch(() => {});

    // products (API may return array or { products: [...] })
    fetch(`/api/products?userId=${encodeURIComponent(userId)}`)
      .then((r) => safeJson(r))
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data)) {
          setProducts(data as Product[]);
        } else if (Array.isArray((data as any).products)) {
          setProducts((data as any).products as Product[]);
        } else {
          // fallback: try top-level arrays
          const arr = Object.values(data).filter((v) => Array.isArray(v)).flat();
          if (arr.length) setProducts(arr[0] as Product[]);
        }
      })
      .catch(() => {});

    setSerialNo(`BILL-${Date.now()}`);
    setDate(new Date().toLocaleDateString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when sameAsBilling toggled on, copy billing -> shipping
  useEffect(() => {
    if (sameAsBilling) setShippingCustomer(billingCustomer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sameAsBilling, billingCustomer]);

  // helper: rupee formatter
  const fmt = (n: number) => `₹${Number(n || 0).toFixed(2)}`;

  // update item safely
  const updateItem = (index: number, changes: Partial<BillItem>) => {
    setItems((prev) => {
      const newItems = prev.map((it) => ({ ...it }));
      const item = newItems[index];
      if (!item) return prev;

      Object.assign(item, changes);

      // ensure numeric fields defined
      item.quantity = Number(item.quantity || 0);
      item.price = Number(item.price || 0);

      // If productName was changed, attempt to find matching product and auto-fill price/unit
      if (changes.productName !== undefined && typeof changes.productName === "string" && changes.productName.trim() !== "") {
        const matched = products.find((p) => p.name.trim().toLowerCase() === changes.productName!.trim().toLowerCase());
        if (matched) {
          // prefer sellingPrice then price then 0
          const selling = (matched as any).sellingPrice ?? (matched as any).price ?? 0;
          item.price = Number(selling || 0);
          item.unit = matched.unit ?? item.unit ?? "";
        }
      }

      // recalc total
      item.total = item.free ? 0 : Number((item.price || 0) * (item.quantity || 0));

      return newItems;
    });
  };

  // toggle free
  const toggleFree = (index: number, v: boolean) => {
    setItems((prev) => {
      const newItems = prev.map((it) => ({ ...it }));
      const it = newItems[index];
      if (!it) return prev;
      it.free = v;
      it.total = v ? 0 : Number((it.price || 0) * (it.quantity || 0));
      return newItems;
    });
  };

  const addLine = () => setItems((prev) => [...prev, blankItem()]);

  // totals
  const subTotal = items.reduce((acc, it) => acc + (it.free ? 0 : Number(it.total || 0)), 0);
  const totalQty = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  const discounted = subTotal - (subTotal * (discountPercent || 0)) / 100;

  // customer suggestion handlers
  const onCustomerInputChange = (val: string) => {
    setCustomerInput(val);
    const cleaned = val.trim().toLowerCase();
    if (!cleaned) {
      setBillingCustomer(null);
      return;
    }

    // exact match
    const exact = customers.find((c) => c.name?.trim().toLowerCase() === cleaned);
    if (exact) {
      setBillingCustomer(exact);
      if (sameAsBilling) setShippingCustomer(exact);
      return;
    }

    // partial matches
    const partial = customers.filter((c) => c.name?.toLowerCase().includes(cleaned));
    if (partial.length === 1) {
      setBillingCustomer(partial[0]);
      if (sameAsBilling) setShippingCustomer(partial[0]);
    } else {
      setBillingCustomer(null);
    }
  };

  // product suggestion: handled by updateItem when productName changes

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />
      <main className="flex-grow container mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow p-6 text-gray-900">
          <h1 className="text-3xl font-bold text-center mb-6">BILL OF SUPPLY</h1>

          {/* HEADER */}
          <div className="border-b pb-4 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {seller?.logoUrl ? (
                  <img src={seller.logoUrl} alt="logo" className="h-20 w-auto object-contain" />
                ) : (
                  <div className="h-20 w-20 rounded-md bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                    No Logo
                  </div>
                )}
              </div>

              <div className="flex-1 text-right">
                <h2 className="text-xl font-bold">{seller?.sellerName || "Seller Name"}</h2>
                <p className="text-sm">{seller?.contact || "-"}</p>
                <p className="text-sm">{seller?.fullAddress || "-"}</p>
                <p className="text-sm">GST: {seller?.gstNumber || "-"}</p>

                <textarea
                  value={fixedLine}
                  onChange={(e) => setFixedLine(e.target.value)}
                  className="mt-2 w-full max-w-md text-sm border rounded p-2 text-gray-900"
                  rows={1}
                />
              </div>
            </div>

            {seller?.slogan && <p className="text-center text-sm font-medium mt-3">{seller.slogan}</p>}
          </div>

          {/* BILLING / SHIPPING */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Billing Details</h3>

              <input
                list="customer-suggestions"
                value={customerInput}
                onChange={(e) => onCustomerInputChange(e.target.value)}
                placeholder="Type or pick a customer name..."
                className="w-full border p-2 rounded text-gray-900"
              />
              <datalist id="customer-suggestions">
                {customers.map((c) => (
                  <option key={c._id} value={c.name} />
                ))}
              </datalist>

              <div className="mt-2 text-sm text-gray-800">
                <div><strong>Name:</strong> {billingCustomer?.name || "-"}</div>
                <div><strong>Address:</strong> {billingCustomer?.address || "-"}</div>
                <div><strong>Contact:</strong> {billingCustomer?.contact || "-"}</div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">Shipping Details</h3>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} />
                Same as Billing
              </label>

              {!sameAsBilling && (
                <>
                  <input
                    list="customer-suggestions"
                    placeholder="Type or pick shipping customer (optional)"
                    className="w-full border p-2 rounded text-gray-900 mt-2"
                    onBlur={(e) => {
                      const val = e.currentTarget.value.trim().toLowerCase();
                      if (!val) return;
                      const match = customers.find((c) => c.name?.trim().toLowerCase() === val);
                      if (match) setShippingCustomer(match);
                    }}
                  />
                </>
              )}

              <div className="mt-2 text-sm text-gray-800">
                <div><strong>Name:</strong> {sameAsBilling ? (billingCustomer?.name || "-") : (shippingCustomer?.name || "-")}</div>
                <div><strong>Address:</strong> {sameAsBilling ? (billingCustomer?.address || "-") : (shippingCustomer?.address || "-")}</div>
                <div><strong>Contact:</strong> {sameAsBilling ? (billingCustomer?.contact || "-") : (shippingCustomer?.contact || "-")}</div>
              </div>
            </div>
          </div>

          {/* SERIAL + DATE */}
          <div className="flex justify-between items-center mb-4 text-sm">
            <div><strong>Serial No:</strong> {serialNo}</div>
            <div><strong>Date:</strong> {date}</div>
          </div>

          {/* PRODUCT TABLE */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-100 text-sm">
                  <th className="border px-2 py-2">#</th>
                  <th className="border px-2 py-2">Product (suggestions)</th>
                  <th className="border px-2 py-2">Quantity</th>
                  <th className="border px-2 py-2">Price</th>
                  <th className="border px-2 py-2">Total</th>
                  <th className="border px-2 py-2">Free</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="text-sm even:bg-white odd:bg-gray-50">
                    <td className="border px-2 py-1 text-center align-middle">{idx + 1}</td>

                    <td className="border px-2 py-1">
                      <input
                        list="product-suggestions"
                        value={it.productName}
                        onChange={(e) => updateItem(idx, { productName: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-gray-900"
                        placeholder="Start typing product..."
                      />
                    </td>

                    <td className="border px-2 py-1 text-center">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, { quantity: Number(e.target.value || 0) })}
                        className="w-20 border rounded px-2 py-1 text-center text-gray-900"
                      />
                    </td>

                    <td className="border px-2 py-1 text-center">
                      {it.free ? (
                        <span className="font-semibold text-red-600">FREE</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={it.price}
                            onChange={(e) => updateItem(idx, { price: Number(e.target.value || 0) })}
                            className="w-24 border rounded px-2 py-1 text-center text-gray-900"
                          />
                          {it.unit ? <span className="text-xs text-gray-600">/{it.unit}</span> : null}
                        </div>
                      )}
                    </td>

                    <td className="border px-2 py-1 text-center">
                      {it.free ? <span className="font-semibold text-red-600">FREE</span> : <span>{fmt(it.total)}</span>}
                    </td>

                    <td className="border px-2 py-1 text-center">
                      <input type="checkbox" checked={it.free} onChange={(e) => toggleFree(idx, e.target.checked)} />
                    </td>
                  </tr>
                ))}

                <tr className="bg-gray-100 font-semibold">
                  <td className="border px-2 py-2 text-right" colSpan={2}>Total Quantity</td>
                  <td className="border px-2 py-2 text-center">{totalQty}</td>
                  <td className="border px-2 py-2"></td>
                  <td className="border px-2 py-2 text-center">{fmt(subTotal)}</td>
                  <td className="border px-2 py-2"></td>
                </tr>
              </tbody>
            </table>

            <datalist id="product-suggestions">
              {products.map((p) => (
                <option key={p._id} value={p.name} />
              ))}
            </datalist>

            <div className="mt-3 flex items-center gap-3">
              <button onClick={addLine} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">+ Add Line</button>
              <p className="text-xs text-gray-500">You can add more lines (default 15 lines shown). Selecting a suggested product will auto-fill price/unit (editable).</p>
            </div>
          </div>

          {/* DISCOUNT / TOTAL */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Discount (%)</label>
              <input type="number" min={0} max={100} step="any" value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value || 0))} className="w-28 border rounded px-2 py-1 text-gray-900" />
            </div>

            <div className="text-right">
              <div className="text-sm">Subtotal: <strong>{fmt(subTotal)}</strong></div>
              <div className="text-lg font-bold">Total after Discount: {fmt(discounted)}</div>
            </div>
          </div>

          {/* FOOTER - Payment & Banking */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2">Payment & Banking</h3>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-sm">
                <div><strong>Bank:</strong> {bank?.bankName || seller?.bankName || "-"}</div>
                <div><strong>Branch:</strong> {bank?.branchName || seller?.branchName || "-"}</div>
                <div><strong>Account No:</strong> {bank?.accountNumber || (seller as any)?.accountNo || "-"}</div>
                <div><strong>IFSC:</strong> {bank?.ifscCode || (seller as any)?.ifscCode || "-"}</div>
                <div><strong>In Favour of:</strong> {bank?.bankingName || seller?.bankingName || "-"}</div>
              </div>

              <div className="flex items-center justify-center">
                {seller?.qrCodeUrl ? <img src={seller.qrCodeUrl} alt="Payment QR" className="h-32 object-contain" /> : <div className="text-xs text-gray-500">No payment QR available</div>}
              </div>

              <div className="text-right">
                {seller?.signatureUrl ? <img src={seller.signatureUrl} alt="Signature" className="h-16 object-contain mx-auto" /> : <div className="text-xs text-gray-500">No signature uploaded</div>}
                <div className="mt-2 text-sm text-center">{seller?.slogan || ""}</div>
              </div>
            </div>

            <div className="mt-3">
              <textarea placeholder="Remarks / Note (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full border rounded p-2 text-gray-900" rows={2} />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="mt-4 flex items-center justify-end gap-3">
            <button onClick={() => toast.success("Bill prepared (not persisted). Use Export to PDF / Print to save.")} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">✅ Prepare Bill</button>

            <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">🖨️ Print / Export</button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
