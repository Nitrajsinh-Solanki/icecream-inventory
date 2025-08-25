// icecream-inventory/src/app/dashboard/stocks/history/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";   // ✅ Import router
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";

interface RestockItem {
  productId: string;
  name: string;
  category?: string;
  unit: string;
  quantity: number;
  note: string;
}

interface RestockHistory {
  _id: string;
  createdAt: string;
  items: RestockItem[];
}

export default function HistoryPage() {
  const [history, setHistory] = useState<RestockHistory[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filters & sorting
  const [searchDate, setSearchDate] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [thisMonthOnly, setThisMonthOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const router = useRouter(); // ✅ Router hook

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id) setUserId(String(parsed._id));
      } catch {}
    }
  }, []);

  const fetchHistory = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/restockHistory?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchHistory();
  }, [userId]);

  // Format date to DD/MM/YYYY HH:mm
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Apply filters and sorting
  const filteredHistory = history
    .filter((h) => {
      const formattedDate = formatDateTime(h.createdAt).split(" ")[0]; // Only date for filtering

      // Search by exact DD/MM/YYYY
      if (searchDate && !formattedDate.includes(searchDate)) return false;

      const d = new Date(h.createdAt);

      // Month filter (e.g. "2025-08")
      if (monthFilter) {
        const [year, month] = monthFilter.split("-");
        if (
          d.getFullYear() !== parseInt(year) ||
          d.getMonth() + 1 !== parseInt(month)
        ) {
          return false;
        }
      }

      // This month filter
      if (thisMonthOnly) {
        const now = new Date();
        if (
          d.getFullYear() !== now.getFullYear() ||
          d.getMonth() !== now.getMonth()
        ) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? da - db : db - da;
    });

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />

      <main className="flex-grow container mx-auto px-4 py-6">
        {/* Title + Back Button */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Restock History</h1>
          <button
            onClick={() => router.push("/dashboard/stocks")}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow"
          >
            Back to Home
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-100 border border-gray-300 p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search (DD/MM/YYYY)"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="border border-gray-400 rounded px-3 py-2 w-52 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="border border-gray-400 rounded px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
          />
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={thisMonthOnly}
              onChange={(e) => setThisMonthOnly(e.target.checked)}
            />
            This Month Only
          </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            className="border border-gray-400 rounded px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
          <button
            onClick={() => {
              setSearchDate("");
              setMonthFilter("");
              setThisMonthOnly(false);
              setSortOrder("desc");
            }}
            className="bg-gray-300 hover:bg-gray-400 text-sm px-3 py-2 rounded text-gray-900 font-medium"
          >
            Reset
          </button>
        </div>

        {loading ? (
          <p className="text-gray-700">Loading...</p>
        ) : filteredHistory.length === 0 ? (
          <p className="text-gray-700">No restock history found.</p>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((h) => (
              <div key={h._id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDateTime(h.createdAt)}
                    </p>
                    <p className="text-sm text-gray-600 italic">
                      Reason: {h.items[0]?.note || "Restocking"}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setExpanded(expanded === h._id ? null : h._id)
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                  >
                    {expanded === h._id ? "Hide" : "View"}
                  </button>
                </div>

                {expanded === h._id && (
                  <table className="w-full mt-4 border-collapse text-sm text-gray-800">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Name</th>
                        <th className="px-4 py-2 text-left font-semibold">Category</th>
                        <th className="px-4 py-2 text-left font-semibold">Quantity</th>
                        <th className="px-4 py-2 text-left font-semibold">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {h.items.map((item) => (
                        <tr
                          key={item.productId}
                          className="border-t hover:bg-gray-50"
                        >
                          <td className="px-4 py-2">{item.name}</td>
                          <td className="px-4 py-2">{item.category || "-"}</td>
                          <td className="px-4 py-2">{`${item.quantity} ${item.unit}`}</td>
                          <td className="px-4 py-2">{item.note || "Restocking"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
