// src/app/dashboard/stocks/page.tsx

"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

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
          <button
            onClick={() => router.push("/dashboard/stocks/restock")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
          >
            Restock
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
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((p, i) => {
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
