// icecream-inventory/src/app/components/DashboardNavbar.tsx

"use client";

import Link from "next/link";
import { Package, Boxes, UserCircle, Users } from "lucide-react";

export default function DashboardNavbar() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left - Logo with link to dashboard */}
        <Link
          href="/dashboard"
          className="flex items-center space-x-2 hover:opacity-90 transition"
        >
          <img
            src="/logo.png"
            alt="Logo"
            className="h-10 w-10 object-contain rounded-full border border-white shadow-md"
          />
          <span className="font-bold text-xl text-white">
            IceCream Inventory
          </span>
        </Link>

        {/* Center - Nav Links */}
        <nav className="hidden md:flex space-x-8 font-medium text-white">
          <Link
            href="/dashboard/products"
            className="flex items-center gap-2 hover:text-yellow-300 transition"
          >
            <Package size={18} /> Product Management
          </Link>
          <Link
            href="/dashboard/stocks"
            className="flex items-center gap-2 hover:text-yellow-300 transition"
          >
            <Boxes size={18} /> Stock Management
          </Link>
          <Link
            href="/dashboard/customers"
            className="flex items-center gap-2 hover:text-yellow-300 transition"
          >
            <Users size={18} /> Customer Management
          </Link>
        </nav>

        {/* Right - Profile */}
        <div className="flex items-center">
          <Link
            href="/dashboard/profile"
            className="hover:text-yellow-300 transition"
          >
            <UserCircle size={32} className="text-white" />
          </Link>
        </div>
      </div>
    </header>
  );
}
