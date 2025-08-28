// src/app/dashboard/stocks/page.tsx




"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Product {
  _id: string;
  userId: string;
  name: string;
  category?: string;
  unit: "piece" | "box" | "kg" | "litre" | "gm" | "ml";
  quantity: number;
  minStock?: number;
}

export default function StockPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  // Load userId from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id) setUserId(String(parsed._id));
      } catch {
        // ignore errors
      }
    }
  }, []);

  // Fetch stock data
  const fetchStocks = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/products?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("Failed to fetch stocks");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load stock data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Apply filtering
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(searchTerm.toLowerCase());

    const isLowStock = p.minStock !== undefined && p.quantity < p.minStock;
    return matchSearch && (!showLowStock || isLowStock);
  });

  // ✅ Format date/time for filename
  const getDateTimeString = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${day}-${month}-${year}-${hours}-${minutes}`;
  };

  // ✅ Download Stock Report
  const downloadStockReport = () => {
    if (filteredProducts.length === 0) {
      toast.error("No stock records to download");
      return;
    }
  
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Stock Report", 14, 15);
  
    // ✅ Add Date & Time below the title
    const now = new Date();
    const dateTime = `${String(now.getDate()).padStart(2, "0")}/${
      String(now.getMonth() + 1).padStart(2, "0")
    }/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  
    doc.setFontSize(11);
    doc.text(`Generated on: ${dateTime}`, 14, 22);
  
    // Prepare table data
    const tableData = filteredProducts.map((p) => [
      p.name,
      p.category || "-",
      `${p.quantity} ${p.unit}`,
      p.minStock !== undefined ? p.minStock : "-",
    ]);
  
    autoTable(doc, {
      head: [["Name", "Category", "Quantity", "Min Stock"]],
      body: tableData,
      startY: 30, // ⬅️ shifted down because we added date/time
      didParseCell: function (data) {
        if (data.section === "body") {
          const rowIndex = data.row.index;
          const product = filteredProducts[rowIndex];
          const isLow =
            product.minStock !== undefined && product.quantity < product.minStock;
  
          if (isLow) {
            data.cell.styles.fillColor = [255, 200, 200]; // light red bg
            data.cell.styles.textColor = [180, 0, 0]; // dark red text
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
  
    const fileName = `STOCK-${getDateTimeString()}.pdf`;
    doc.save(fileName);
  };
  

  // If not logged in
  if (!userId) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-800">Not signed in</h2>
          <p className="text-sm text-gray-600 mt-2">
            Please log in to view stock data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />

      <main className="flex-grow container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Stock Management</h1>
          <div className="flex gap-3">
          {filteredProducts.length === 0 ? (
  <button
    disabled
    className="flex items-center gap-2 bg-gray-300 text-gray-600 font-medium px-4 py-2 rounded-lg shadow cursor-not-allowed"
  >
    No Stock to Export
  </button>
) : (
  <button
    onClick={downloadStockReport}
    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg shadow transition-all duration-300"
  >
    Download Stock Report
  </button>
)}

            <button
              onClick={() => router.push("/dashboard/stocks/history")}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow"
            >
              View History
            </button>
            <button
              onClick={() => router.push("/dashboard/stocks/restock")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
            >
              Restock
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-gray-100 border border-gray-300 p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search by Name or Category"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-400 rounded px-3 py-2 w-64 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
          />
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
            />
            Show Low Stock Items
          </label>
          <button
            onClick={() => {
              setSearchTerm("");
              setShowLowStock(false);
            }}
            className="bg-gray-300 hover:bg-gray-400 text-sm px-3 py-2 rounded text-gray-900 font-medium"
          >
            Reset
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded-2xl shadow-lg">
          <table className="w-full border-collapse">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">
                  Quantity
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-gray-600">
                    Loading...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, i) => {
                  const isLow = p.minStock !== undefined && p.quantity < p.minStock;
                  return (
                    <tr
                      key={p._id}
                      className={`text-gray-700 transition ${
                        isLow
                          ? "bg-red-50 text-red-700"
                          : i % 2 === 0
                          ? "bg-gray-50"
                          : "bg-white"
                      } hover:shadow-md`}
                    >
                      <td className="px-6 py-4 font-medium">{p.name}</td>
                      <td className="px-6 py-4">{p.category || "-"}</td>
                      <td className="px-6 py-4">{`${p.quantity} ${p.unit}`}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      <Footer />
    </div>
  );
}
