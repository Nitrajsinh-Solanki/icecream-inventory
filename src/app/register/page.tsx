// icecream-inventory\src\app\register\page.tsx



// icecream-inventory/src/app/register/page.tsx

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { User, Mail, Store, MapPin, Lock, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    shopName: "",
    shopAddress: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.shopName || !form.shopAddress || !form.password || !form.confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/register", {
        method: "POST",
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Registration failed!");
        setLoading(false);
        return;
      }

      toast.success("OTP sent to your email!");
      // 👇 Redirect instantly (no extra clicks, no delay)
      router.replace(`/verify-otp?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100">
      <Navbar />

      <main className="flex-grow flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left panel / marketing */}
          <div className="hidden md:flex flex-col justify-center rounded-2xl p-10 bg-gradient-to-b from-blue-600 to-indigo-600 text-white shadow-xl">
            <h2 className="text-4xl font-extrabold mb-4">Create your account</h2>
            <p className="text-white/90 mb-6">
              One place to manage inventory, expiry alerts, and reports — built
              for ice cream wholesalers.
            </p>
            <ul className="space-y-3 text-white/95">
              <li className="flex items-center gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">✓</span>
                Real-time stock tracking
              </li>
              <li className="flex items-center gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">✓</span>
                Automatic expiry notifications
              </li>
              <li className="flex items-center gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">✓</span>
                Clean reports and analytics
              </li>
            </ul>
          </div>

          {/* Right panel / form */}
          <div className="bg-white shadow-2xl rounded-2xl p-8">
            <div className="mb-6 text-center">
              <h3 className="text-3xl font-bold text-blue-700">Sign up</h3>
              <p className="text-gray-600 mt-1">It takes less than a minute.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    name="name"
                    onChange={handleChange}
                    placeholder="e.g., Nitrajsinh Solanki"
                    autoComplete="name"
                    required
                    className="w-full border border-gray-300 pl-10 pr-3 py-3 rounded-md 
                      focus:ring-2 focus:ring-blue-400 outline-none 
                      placeholder-gray-600 text-gray-900 text-base"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    name="email"
                    type="email"
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="w-full border border-gray-300 pl-10 pr-3 py-3 rounded-md 
                      focus:ring-2 focus:ring-blue-400 outline-none 
                      placeholder-gray-600 text-gray-900 text-base"
                  />
                </div>
              </div>

              {/* Shop Name */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">Shop Name</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    name="shopName"
                    onChange={handleChange}
                    placeholder="e.g., Amar Ice Cream Wholesale"
                    required
                    className="w-full border border-gray-300 pl-10 pr-3 py-3 rounded-md 
                      focus:ring-2 focus:ring-blue-400 outline-none 
                      placeholder-gray-600 text-gray-900 text-base"
                  />
                </div>
              </div>

              {/* Shop Address */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">Shop Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                  <textarea
                    name="shopAddress"
                    onChange={handleChange}
                    placeholder="Street, Area, City, Pincode"
                    rows={2}
                    required
                    className="w-full border border-gray-300 pl-10 pr-3 py-3 rounded-md 
                      focus:ring-2 focus:ring-blue-400 outline-none 
                      placeholder-gray-600 text-gray-900 text-base resize-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    name="password"
                    type={showPwd ? "text" : "password"}
                    onChange={handleChange}
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    className="w-full border border-gray-300 pl-10 pr-10 py-3 rounded-md 
                      focus:ring-2 focus:ring-blue-400 outline-none 
                      placeholder-gray-600 text-gray-900 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-gray-700 font-medium mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    name="confirmPassword"
                    type={showConfirmPwd ? "text" : "password"}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    className="w-full border border-gray-300 pl-10 pr-10 py-3 rounded-md 
                      focus:ring-2 focus:ring-blue-400 outline-none 
                      placeholder-gray-600 text-gray-900 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label={showConfirmPwd ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full text-white font-semibold py-3 rounded-md transition 
                  ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {loading ? "Sending OTP..." : "Register"}
              </button>

              <p className="text-center text-gray-600 text-sm">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                  Login
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>

      <Footer />
      <ToastContainer position="top-right" closeOnClick theme="light" />
    </div>
  );
}
