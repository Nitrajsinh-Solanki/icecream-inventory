// src/app/dashboard/billing/page.tsx
"use client";
import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Customer = {
  _id: string;
  name: string;
  contact?: string;
  address?: string;
  contacts?: string[];
  shopName?: string;
  shopAddress?: string;
};

type Product = {
  _id: string;
  name: string;
  unit?: string;
  sellingPrice?: number;
  price?: number;
};

type SellerDetails = {
  _id?: string;
  sellerName?: string;
  gstNumber?: string;
  fullAddress?: string;
  contact?: string;
  slogan?: string;
  logoUrl?: string;
  qrCodeUrl?: string;
  signatureUrl?: string;
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
  price: number;
  total: number;
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
  const [shippingCustomer, setShippingCustomer] = useState<Customer | null>(
    null
  );
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [customerInput, setCustomerInput] = useState<string>("");

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
    quantity: 0,
    unit: "",
    price: 0,
    total: 0,
    free: false,
  });
  const [items, setItems] = useState<BillItem[]>(
    Array.from({ length: 15 }, blankItem)
  );

  // discount & remarks
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>("");

  // ===== Helpers =====
  const safeJson = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const generateSerial = () => {
    // pattern: MM + 4-digit serial (per month, stored in localStorage)
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // 01..12
    const year = now.getFullYear();
    const key = `serial-${month}-${year}`;
    // stored value may be padded string like "0001"
    let last = Number(localStorage.getItem(key) || "0");
    last = last + 1;
    if (last > 9999) last = 1;
    localStorage.setItem(key, String(last).padStart(4, "0"));
    return `${month}${String(last).padStart(4, "0")}`;
  };

  // ===== Load Data =====
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      toast.error("User not found in localStorage");
      return;
    }
    const parsed = JSON.parse(stored);
    const userId = parsed._id;

    // --- Fetch Seller ---
    fetch(`/api/seller-details?userId=${encodeURIComponent(userId)}`)
      .then((r) => safeJson(r))
      .then((s) => {
        if (s && !s.error) {
          setSeller(s);
        }
      })
      .catch(() => {});

    // --- Fetch Customers ---
    fetch(`/api/customers?userId=${encodeURIComponent(userId)}`)
      .then((r) => safeJson(r))
      .then((data) => {
        if (!data) return;
        let arr: any[] = [];
        if (Array.isArray(data)) arr = data;
        else if (Array.isArray((data as any).customers))
          arr = (data as any).customers;
        else
          arr = Object.values(data)
            .filter((v) => Array.isArray(v))
            .flat();
        if (arr.length) {
          const mapped = arr.map((c: any) => ({
            _id: c._id,
            name: c.name,
            contact: Array.isArray(c.contacts)
              ? c.contacts[0]
              : c.contacts ?? c.contact ?? "",
            address: c.shopAddress ?? c.address ?? c.shopAddress ?? "",
          }));
          setCustomers(mapped);
        }
      })
      .catch(() => {});

    // --- Fetch Products ---
    fetch(`/api/products?userId=${encodeURIComponent(userId)}`)
      .then((r) => safeJson(r))
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data)) {
          setProducts(data as Product[]);
        } else if (Array.isArray((data as any).products)) {
          setProducts((data as any).products as Product[]);
        } else {
          const arr = Object.values(data)
            .filter((v) => Array.isArray(v))
            .flat();
          if (arr.length) setProducts(arr[0] as Product[]);
        }
      })
      .catch(() => {});

    // --- Set Serial & Date ---
    setSerialNo(generateSerial());
    const now = new Date();
    const formatted = `${String(now.getDate()).padStart(2, "0")}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${now.getFullYear()}`;
    setDate(formatted);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Fetch Bank (Priority) based on seller._id (seller doc may not have _id until loaded)
  useEffect(() => {
    if (!seller?._id) {
      // also attempt to pull bank fields out of seller doc if they exist
      if (
        seller &&
        (seller.bankName ||
          (seller as any).accountNumber ||
          (seller as any).accountNo ||
          (seller as any).ifscCode)
      ) {
        const possibleBank: BankDetails = {
          bankName: seller.bankName,
          branchName: seller.branchName,
          accountNumber:
            (seller as any).accountNumber ?? (seller as any).accountNo,
          ifscCode: seller.ifscCode,
          bankingName: seller.bankingName,
        };
        setBank(possibleBank);
      }
      return;
    }

    fetch(`/api/bank-details?sellerId=${encodeURIComponent(seller._id)}`)
      .then((r) => safeJson(r))
      .then((b) => {
        if (b && !b.error && Object.keys(b).length) {
          // if API returns array or object, normalize
          const bankObj: any = Array.isArray(b) ? b[0] ?? b : b;
          setBank(bankObj);
        } else {
          // fallback to seller doc
          const possibleBank: BankDetails = {
            bankName: seller.bankName,
            branchName: seller.branchName,
            accountNumber:
              (seller as any).accountNumber ?? (seller as any).accountNo,
            ifscCode: seller.ifscCode,
            bankingName: seller.bankingName,
          };
          if (possibleBank.bankName || possibleBank.accountNumber) {
            setBank(possibleBank);
          }
        }
      })
      .catch(() => {
        const possibleBank: BankDetails = {
          bankName: seller.bankName,
          branchName: seller.branchName,
          accountNumber:
            (seller as any).accountNumber ?? (seller as any).accountNo,
          ifscCode: seller.ifscCode,
          bankingName: seller.bankingName,
        };
        if (possibleBank.bankName || possibleBank.accountNumber) {
          setBank(possibleBank);
        }
      });
  }, [seller]);

  // when sameAsBilling toggled on, copy billing -> shipping
  useEffect(() => {
    if (sameAsBilling) setShippingCustomer(billingCustomer);
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
      item.quantity = Number(item.quantity || 0);
      item.price = Number(item.price || 0);

      // If productName was changed, attempt to find matching product and auto-fill price/unit
      if (
        changes.productName !== undefined &&
        typeof changes.productName === "string" &&
        changes.productName.trim() !== ""
      ) {
        const matched = products.find(
          (p) =>
            p.name.trim().toLowerCase() ===
            changes.productName!.trim().toLowerCase()
        );
        if (matched) {
          const selling =
            (matched as any).sellingPrice ?? (matched as any).price ?? 0;
          item.price = Number(selling || 0);
          item.unit = matched.unit ?? item.unit ?? "";
        }
      }

      // recalc total
      item.total = item.free
        ? 0
        : Number((item.price || 0) * (item.quantity || 0));

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
  const subTotal = items.reduce(
    (acc, it) => acc + (it.free ? 0 : Number(it.total || 0)),
    0
  );
  const totalQty = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0),
    0
  );
  const discounted = subTotal - (subTotal * (discountPercent || 0)) / 100;

  // customer suggestion handlers
  const onCustomerInputChange = (val: string) => {
    setCustomerInput(val);
    const cleaned = val.trim().toLowerCase();
    if (!cleaned) {
      setBillingCustomer(null);
      return;
    }
    const exact = customers.find(
      (c) => c.name?.trim().toLowerCase() === cleaned
    );
    if (exact) {
      setBillingCustomer(exact);
      if (sameAsBilling) setShippingCustomer(exact);
      return;
    }
    const partial = customers.filter((c) =>
      c.name?.toLowerCase().includes(cleaned)
    );
    if (partial.length === 1) {
      setBillingCustomer(partial[0]);
      if (sameAsBilling) setShippingCustomer(partial[0]);
    } else {
      setBillingCustomer(null);
    }
  };


  
// inside BillingPage component
const exportPDF = () => {
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ===== HEADER =====
  const header = () => {
    doc.setFontSize(16).setFont("helvetica", "bold");
    doc.text("BILL OF SUPPLY", pageWidth / 2, 40, { align: "center" });
    doc.setDrawColor(0);
    doc.line(40, 55, pageWidth - 40, 55);
  };

  // ===== FOOTER =====
  const footer = (pageNumber: number, totalPages: number) => {
    doc.setDrawColor(200);
    doc.line(40, pageHeight - 50, pageWidth - 40, pageHeight - 50);
    doc.setFontSize(9).setTextColor(100);
    doc.text(
      seller?.slogan || "Thank you for your business!",
      pageWidth / 2,
      pageHeight - 35,
      { align: "center" }
    );
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 80, pageHeight - 35);
  };

  let y = 70;

  // ===== SELLER DETAILS =====
  doc.rect(40, y, pageWidth - 80, 80);
  if (seller?.logoUrl) {
    try {
      doc.addImage(seller.logoUrl, "PNG", 45, y + 10, 60, 60);
    } catch {}
  }
  doc.setFontSize(12).setFont("helvetica", "bold");
  doc.text(seller?.sellerName || "Seller Name", 120, y + 25);
  doc.setFontSize(10).setFont("helvetica", "normal");
  doc.text(seller?.fullAddress || "-", 120, y + 40);
  doc.text(`GST: ${seller?.gstNumber || "-"}`, 120, y + 55);
  y += 100;

  // ===== BILLING / SHIPPING =====
  doc.rect(40, y, pageWidth - 80, 90);
  doc.line(pageWidth / 2, y, pageWidth / 2, y + 90);

  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("Billing Details", 50, y + 20);
  doc.text("Shipping Details", pageWidth / 2 + 10, y + 20);

  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`Name: ${billingCustomer?.name || "-"}`, 50, y + 40);
  doc.text(
    `Name: ${sameAsBilling ? billingCustomer?.name || "-" : shippingCustomer?.name || "-"}`,
    pageWidth / 2 + 10,
    y + 40
  );
  doc.text(`Address: ${billingCustomer?.address || "-"}`, 50, y + 55);
  doc.text(
    `Address: ${sameAsBilling ? billingCustomer?.address || "-" : shippingCustomer?.address || "-"}`,
    pageWidth / 2 + 10,
    y + 55
  );
  doc.text(`Contact: ${billingCustomer?.contact || "-"}`, 50, y + 70);
  doc.text(
    `Contact: ${sameAsBilling ? billingCustomer?.contact || "-" : shippingCustomer?.contact || "-"}`,
    pageWidth / 2 + 10,
    y + 70
  );

  y += 110;

  // ===== SERIAL + DATE =====
  doc.rect(40, y, pageWidth - 80, 30);
  doc.setFontSize(10).setFont("helvetica", "normal");
  doc.text(`Serial No: ${serialNo}`, 50, y + 20);
  doc.text(`Date: ${date}`, pageWidth - 200, y + 20);
  y += 50;

  // ===== ITEMS TABLE =====
  const filledItems = items.filter(
    (it) => it.productName || it.quantity || it.price || it.total
  );
  const tableBody = filledItems.map((it, idx) => [
    idx + 1,
    it.productName || "-",
    it.quantity,
    it.unit || "-",
    it.free ? "FREE" : `Rs ${Number(it.price || 0).toFixed(2)}`,
    it.free ? "FREE" : `Rs ${Number(it.total || 0).toFixed(2)}`,
  ]);

  const subTotal = filledItems.reduce(
    (acc, it) => acc + (it.free ? 0 : Number(it.total || 0)),
    0
  );
  const discounted = subTotal - (subTotal * (discountPercent || 0)) / 100;

  autoTable(doc, {
    head: [["#", "Product", "Qty", "Unit", "Price", "Total"]],
    body: [
      ...tableBody,
      [
        { content: "Subtotal", colSpan: 5, styles: { halign: "right", fontStyle: "bold" } },
        `Rs ${subTotal.toFixed(2)}`,
      ],
      [
        { content: `Discount (${discountPercent}%)`, colSpan: 5, styles: { halign: "right" } },
        `Rs ${(subTotal - discounted).toFixed(2)}`,
      ],
      [
        { content: "Grand Total", colSpan: 5, styles: { halign: "right", fontStyle: "bold" } },
        `Rs ${discounted.toFixed(2)}`,
      ],
    ],
    startY: y,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 4, halign: "center" },
    headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didDrawPage: () => header(),
    margin: { top: 100, bottom: 120 },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 20;

  // ===== FIXED LINE (composition note) =====
  doc.setFont("helvetica", "italic").setFontSize(10);
  doc.text(
    fixedLine ||
      "composition taxable person not eligible to collect taxes on supplies",
    50,
    finalY,
    { maxWidth: pageWidth - 100 }
  );
  finalY += 25;

  // ===== PAYMENT & BANKING =====
  doc.rect(40, finalY, pageWidth - 80, 120);
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("Payment & Banking Details", 50, finalY + 20);

  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`Bank: ${bank?.bankName || "-"}`, 50, finalY + 40);
  doc.text(`Branch: ${bank?.branchName || "-"}`, 50, finalY + 55);
  doc.text(`Account No: ${bank?.accountNumber || "-"}`, 50, finalY + 70);
  doc.text(`IFSC: ${bank?.ifscCode || "-"}`, 50, finalY + 85);
  doc.text(`In Favour of: ${bank?.bankingName || "-"}`, 50, finalY + 100);

  if (seller?.qrCodeUrl) {
    try {
      doc.addImage(seller.qrCodeUrl, "PNG", 300, finalY + 20, 100, 100);
    } catch {}
  }
  if (seller?.signatureUrl) {
    try {
      doc.addImage(seller.signatureUrl, "PNG", pageWidth - 180, finalY + 20, 120, 60);
      doc.setFontSize(10).text("Authorized Signature", pageWidth - 120, finalY + 90, {
        align: "center",
      });
    } catch {}
  }

  // ===== REMARKS =====
  if (remarks) {
    finalY += 140;
    doc.setFont("helvetica", "bold").text("Remarks:", 40, finalY);
    doc.setFont("helvetica", "normal").text(remarks, 40, finalY + 15, {
      maxWidth: pageWidth - 80,
    });
  }

  // ===== FOOTER =====
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    footer(i, totalPages);
  }

  doc.save(`Bill_${serialNo || "invoice"}.pdf`);
};


  
  
  
  
  
  
  

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />

      {/* PRINT HEADER - fixed for printed pages; also visible on screen (kept at top of content) */}
      <header className="bg-white border-b print:fixed print:top-0 print:left-0 print:right-0 print:shadow-sm print:bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {seller?.logoUrl ? (
                <img
                  src={seller.logoUrl}
                  alt="logo"
                  className="h-20 w-auto object-contain"
                />
              ) : (
                <div className="h-20 w-20 rounded-md bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                  No Logo
                </div>
              )}
            </div>
            <div className="flex-1 text-right">
              <h2 className="text-xl font-bold text-gray-700">
                {seller?.sellerName || "Seller Name"}
              </h2>
              <p className="text-sm text-gray-700">{seller?.contact || "-"}</p>
              <p className="text-sm text-gray-700">{seller?.fullAddress || "-"}</p>
              <p className="text-sm text-gray-800">GST: {seller?.gstNumber || "-"}</p>
              <div className="mt-1">
                <input
                  value={fixedLine}
                  onChange={(e) => setFixedLine(e.target.value)}
                  className="hidden print:block w-full text-xs border-0 bg-transparent text-gray-700"
                  readOnly
                />
                <textarea
                  value={fixedLine}
                  onChange={(e) => setFixedLine(e.target.value)}
                  className="mt-2 w-full max-w-md text-sm border rounded p-2 text-gray-900 print:hidden"
                  rows={1}
                />
              </div>
            </div>
          </div>
          {seller?.slogan && (
            <p className="text-gray-700 text-center text-sm font-medium mt-3 print:block">
              {seller.slogan}
            </p>
          )}
        </div>
      </header>

      {/* MAIN content: add top margin when printing to avoid overlap with fixed header */}
      <main className="flex-grow container mx-auto px-6 py-8 print:mt-44 print:mb-32">
        <div className="bg-white rounded-lg shadow p-6 text-gray-900">
          <h1 className="text-3xl font-bold text-center mb-6">
            BILL OF SUPPLY
          </h1>

          {/* BILLING / SHIPPING */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Billing Details</h3>

              {/* input + suggestions (print:hidden) */}
              <div className="flex gap-2">
                <input
                  suppressHydrationWarning
                  list="customer-suggestions"
                  value={customerInput}
                  onChange={(e) => onCustomerInputChange(e.target.value)}
                  placeholder="Type or pick a customer name..."
                  className="w-full border p-2 rounded text-gray-900 print:hidden"
                />
                <button
                  onClick={() => {
                    // quick clear selection
                    setCustomerInput("");
                    setBillingCustomer(null);
                  }}
                  className="px-3 py-2 bg-gray-200 rounded text-sm print:hidden"
                >
                  Clear
                </button>
              </div>

              <datalist id="customer-suggestions">
                {customers.map((c) => (
                  <option key={c._id} value={c.name} />
                ))}
              </datalist>

              <div className="mt-2 text-sm text-gray-800">
                <div>
                  <strong>Name:</strong> {billingCustomer?.name || "-"}
                </div>
                <div>
                  <strong>Address:</strong> {billingCustomer?.address || "-"}
                </div>
                <div>
                  <strong>Contact:</strong> {billingCustomer?.contact || "-"}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">Shipping Details</h3>
              <label className="flex items-center gap-2 text-sm print:hidden">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => setSameAsBilling(e.target.checked)}
                />
                Same as Billing
              </label>

              {!sameAsBilling && (
                <input
                  suppressHydrationWarning
                  list="customer-suggestions"
                  placeholder="Type or pick shipping customer (optional)"
                  className="w-full border p-2 rounded text-gray-900 mt-2 print:hidden"
                  onBlur={(e) => {
                    const val = e.currentTarget.value.trim().toLowerCase();
                    if (!val) return;
                    const match = customers.find(
                      (c) => c.name?.trim().toLowerCase() === val
                    );
                    if (match) setShippingCustomer(match);
                  }}
                />
              )}

              <div className="mt-2 text-sm text-gray-800">
                <div>
                  <strong>Name:</strong>{" "}
                  {sameAsBilling
                    ? billingCustomer?.name || "-"
                    : shippingCustomer?.name || "-"}
                </div>
                <div>
                  <strong>Address:</strong>{" "}
                  {sameAsBilling
                    ? billingCustomer?.address || "-"
                    : shippingCustomer?.address || "-"}
                </div>
                <div>
                  <strong>Contact:</strong>{" "}
                  {sameAsBilling
                    ? billingCustomer?.contact || "-"
                    : shippingCustomer?.contact || "-"}
                </div>
              </div>
            </div>
          </div>

          {/* SERIAL + DATE */}
          <div className="flex justify-between items-center mb-4 text-sm">
            <div>
              <strong>Serial No:</strong> {serialNo}
            </div>
            <div>
              <strong>Date:</strong> {date}
            </div>
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
                  <th className="border px-2 py-2 print:hidden">Free</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr
                    key={idx}
                    className="text-sm even:bg-white odd:bg-gray-50"
                  >
                    <td className="border px-2 py-1 text-center align-middle">
                      {idx + 1}
                    </td>

                    <td className="border px-2 py-1">
                      <input
                        suppressHydrationWarning
                        list="product-suggestions"
                        value={it.productName}
                        onChange={(e) =>
                          updateItem(idx, { productName: e.target.value })
                        }
                        className="w-full border rounded px-2 py-1 text-gray-900"
                        placeholder="Start typing product..."
                      />
                    </td>

                    <td className="border px-2 py-1 text-center">
                      <input
                        suppressHydrationWarning
                        type="number"
                        min={0}
                        step="any"
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(idx, {
                            quantity: Number(e.target.value || 0),
                          })
                        }
                        className="w-20 border rounded px-2 py-1 text-center text-gray-900"
                      />
                    </td>

                    <td className="border px-2 py-1 text-center">
                      {it.free ? (
                        <span className="font-semibold text-red-600">FREE</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <input
                            suppressHydrationWarning
                            type="number"
                            min={0}
                            step="any"
                            value={it.price}
                            onChange={(e) =>
                              updateItem(idx, {
                                price: Number(e.target.value || 0),
                              })
                            }
                            className="w-24 border rounded px-2 py-1 text-center text-gray-900"
                          />
                          {it.unit ? (
                            <span className="text-xs text-gray-600">
                              /{it.unit}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>

                    <td className="border px-2 py-1 text-center">
                      {it.free ? (
                        <span className="font-semibold text-red-600">FREE</span>
                      ) : (
                        <span>{fmt(it.total)}</span>
                      )}
                    </td>

                    <td className="border px-2 py-1 text-center print:hidden">
                      <input
                        type="checkbox"
                        checked={it.free}
                        onChange={(e) => toggleFree(idx, e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}

                <tr className="bg-gray-100 font-semibold">
                  <td className="border px-2 py-2 text-right" colSpan={2}>
                    Total Quantity
                  </td>
                  <td className="border px-2 py-2 text-center">{totalQty}</td>
                  <td className="border px-2 py-2"></td>
                  <td className="border px-2 py-2 text-center">
                    {fmt(subTotal)}
                  </td>
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
              <button
                onClick={addLine}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 print:hidden"
              >
                + Add Line
              </button>
              <p className="text-xs text-gray-500 print:hidden">
                You can add more lines (default 15 lines shown). Selecting a
                suggested product will auto-fill price/unit (editable).
              </p>
            </div>
          </div>

          {/* DISCOUNT / TOTAL */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Discount (%)</label>
              <input
                suppressHydrationWarning
                type="number"
                min={0}
                max={100}
                step="any"
                value={discountPercent}
                onChange={(e) =>
                  setDiscountPercent(Number(e.target.value || 0))
                }
                className="w-28 border rounded px-2 py-1 text-gray-900"
              />
            </div>

            <div className="text-right">
              <div className="text-sm">
                Subtotal: <strong>{fmt(subTotal)}</strong>
              </div>
              <div className="text-lg font-bold">
                Total after Discount: {fmt(discounted)}
              </div>
            </div>
          </div>

          {/* FOOTER - Payment & Banking */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2">Payment & Banking</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-sm">
                <div>
                  <strong>Bank:</strong>{" "}
                  {bank?.bankName || seller?.bankName || "-"}
                </div>
                <div>
                  <strong>Branch:</strong>{" "}
                  {bank?.branchName || seller?.branchName || "-"}
                </div>
                <div>
                  <strong>Account No:</strong>{" "}
                  {bank?.accountNumber || (seller as any)?.accountNo || "-"}
                </div>
                <div>
                  <strong>IFSC:</strong>{" "}
                  {bank?.ifscCode || (seller as any)?.ifscCode || "-"}
                </div>
                <div>
                  <strong>In Favour of:</strong>{" "}
                  {bank?.bankingName || seller?.bankingName || "-"}
                </div>
              </div>

              <div className="flex items-center justify-center">
                {seller?.qrCodeUrl ? (
                  <img
                    src={seller.qrCodeUrl}
                    alt="Payment QR"
                    className="h-32 object-contain"
                  />
                ) : (
                  <div className="text-xs text-gray-500">
                    No payment QR available
                  </div>
                )}
              </div>

              <div className="text-right">
                {seller?.signatureUrl ? (
                  <img
                    src={seller.signatureUrl}
                    alt="Signature"
                    className="h-16 object-contain mx-auto"
                  />
                ) : (
                  <div className="text-xs text-gray-500">
                    No signature uploaded
                  </div>
                )}
                <div className="mt-2 text-sm text-center">
                  {seller?.slogan || ""}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <textarea
                suppressHydrationWarning
                placeholder="Remarks / Note (optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full border rounded p-2 text-gray-900"
                rows={2}
              />
            </div>
          </div>

          {/* ACTIONS - screen only */}
          <div className="mt-4 flex items-center justify-end gap-3 print:hidden">
            <button
              onClick={() =>
                toast.success(
                  "Bill prepared (not persisted). Use Export to PDF / Print to save."
                )
              }
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              ✅ Prepare Bill
            </button>
            <button
              onClick={exportPDF}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              📄 Export PDF
            </button>
          </div>
        </div>
      </main>

      {/* PRINT FOOTER - fixed bottom when printing */}
      <footer className="hidden print:block print:fixed print:bottom-0 print:left-0 print:right-0 bg-white p-2 text-center text-xs border-t">
        <div className="max-w-7xl mx-auto px-6">
          <p>{seller?.slogan || "Thank you for your business!"}</p>
        </div>
      </footer>

      <Footer />
    </div>
  );
}
