// icecream-inventory\src\app\components\Navbar.tsx


"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full bg-blue-600 text-white px-6 py-4 flex justify-between items-center shadow-md">
      {/* Logo */}
      <div className="text-2xl font-bold">
        <Link href="/">🍦 IceCream Inventory</Link>
      </div>

      {/* Right side links */}
      <div className="space-x-6">
        <Link href="/login" className="hover:text-gray-200">
          Login
        </Link>
        <Link href="/register" className="hover:text-gray-200">
          Register
        </Link>
      </div>
    </nav>
  );
}
