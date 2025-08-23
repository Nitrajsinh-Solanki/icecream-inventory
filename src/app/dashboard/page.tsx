

// icecream-inventory/src/app/dashboard/page.tsx

"use client";
import Footer from "../components/Footer";
import { Package, Boxes, UserCircle } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left - Logo */}
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
            <span className="font-bold text-xl text-blue-700">IceCream Inventory</span>
          </div>

          {/* Center - Nav Links */}
          <nav className="hidden md:flex space-x-8 font-medium text-gray-700">
            <Link
              href="/dashboard/products"
              className="flex items-center gap-2 hover:text-blue-600 transition"
            >
              <Package size={18} /> Product Management
            </Link>
            <Link
              href="/dashboard/stocks"
              className="flex items-center gap-2 hover:text-blue-600 transition"
            >
              <Boxes size={18} /> Stock Management
            </Link>
          </nav>

          {/* Right - Profile */}
          <div className="flex items-center">
            <Link href="/dashboard/profile" className="hover:text-blue-600">
              <UserCircle size={32} className="text-gray-700" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center text-gray-600">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-blue-700">Welcome to your Dashboard</h1>
          <p className="text-gray-500">Choose an option from above to manage products or stock.</p>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
