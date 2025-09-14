// icecream-inventory/src/app/login/page.tsx

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Mail, Lock } from "lucide-react"; 
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  // ✅ If user already logged in (with rememberMe), redirect
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const remember = localStorage.getItem("rememberMe");
    if (storedUser && remember === "true") {
      router.push("/dashboard");
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    if (res.ok) {
      // ✅ Save user session in localStorage
      localStorage.setItem("user", JSON.stringify(data.user));

      // ✅ Save rememberMe flag
      localStorage.setItem("rememberMe", rememberMe ? "true" : "false");

      toast.success("Login successful! Redirecting...");
      setTimeout(() => router.push("/dashboard"), 2000);
    } else {
      toast.error(data.error || "Invalid credentials!");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-r from-blue-200 to-blue-400">
      <Navbar />

      <main className="flex-grow flex items-center justify-center">
        <div className="flex w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Left Side */}
          <div className="hidden md:flex flex-col justify-center items-center bg-blue-600 text-white p-10 w-1/2">
            <h2 className="text-4xl font-extrabold mb-4">Welcome Back!</h2>
            <p className="text-lg text-center">
              Manage your ice cream stock, check expiry alerts, and keep your shop running smoothly.
            </p>
          </div>

          {/* Right Side (Form) */}
          <div className="flex-1 p-8">
            <h2 className="text-3xl font-bold text-center text-blue-700 mb-2">Login</h2>
            <p className="text-center text-gray-600 mb-6">Access your account</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  name="email"
                  type="email"
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="w-full border border-gray-300 pl-10 pr-3 py-3 rounded-md 
                    focus:ring-2 focus:ring-blue-400 outline-none 
                    placeholder-gray-500 text-gray-900 text-base"
                  required
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  name="password"
                  type="password"
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full border border-gray-300 pl-10 pr-3 py-3 rounded-md 
                    focus:ring-2 focus:ring-blue-400 outline-none 
                    placeholder-gray-500 text-gray-900 text-base"
                  required
                />
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  id="rememberMe"
                  className="h-4 w-4"
                />
                <label htmlFor="rememberMe">Remember Me</label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700 transition transform hover:scale-[1.02] duration-300"
              >
                Login
              </button>
            </form>

            {/* Extra Links */}
            <div className="mt-6 text-center text-sm text-gray-600">
              <p>
                Don’t have an account?{" "}
                <Link href="/register" className="text-blue-600 font-semibold hover:underline">
                  Register
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <ToastContainer />
    </div>
  );
}
