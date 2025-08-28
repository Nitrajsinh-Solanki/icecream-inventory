// src/app/dashboard/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import toast from "react-hot-toast";
import { User, Lock, LogOut } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [originalUser, setOriginalUser] = useState<any>(null); // ✅ store original data
  const [loading, setLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
  });
  const [activeTab, setActiveTab] = useState<"basic" | "password" | "logout">(
    "basic"
  );

  // Fetch user details
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const parsed = JSON.parse(stored);
      fetch(`/api/profile?userId=${parsed._id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.error) {
            toast.error(data.error);
          } else {
            setUser(data);
            setOriginalUser(data); // ✅ keep original
          }
        })
        .catch(() => toast.error("Failed to load profile ❌"));
    }
  }, []);

  // Check if profile data has changed
  const isChanged =
    user &&
    originalUser &&
    (user.name !== originalUser.name ||
      user.email !== originalUser.email ||
      user.contact !== originalUser.contact ||
      user.shopName !== originalUser.shopName ||
      user.shopAddress !== originalUser.shopAddress);

  // Update Profile
  const updateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          name: user.name,
          email: user.email,
          contact: user.contact,
          shopName: user.shopName,
          shopAddress: user.shopAddress,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setUser(data);
        setOriginalUser(data); // ✅ reset original after save
        toast.success("Profile updated successfully ✅");
      } else {
        toast.error(data.error || "Update failed ❌");
      }
    } catch (err) {
      setLoading(false);
      toast.error("Something went wrong ❌");
    }
  };

  // Change Password
  const changePassword = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      toast.error("Please fill both fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, ...passwordForm }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        toast.success("Password changed successfully 🔑");
        setPasswordForm({ oldPassword: "", newPassword: "" });
      } else {
        toast.error(data.error || "Failed to change password ❌");
      }
    } catch (err) {
      setLoading(false);
      toast.error("Something went wrong ❌");
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("user");
    toast.success("Logged out 👋");
    router.push("/login");
  };

  if (!user) return <p className="p-6 text-gray-600">Loading...</p>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <DashboardNavbar />

      <main className="flex-grow container mx-auto px-4 py-8 flex gap-8">
        {/* Sidebar Options */}
        <aside className="w-64 bg-white rounded-xl shadow-md p-4 space-y-2">
          <button
            onClick={() => setActiveTab("basic")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium ${
              activeTab === "basic"
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <User size={18} /> Basic Information
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium ${
              activeTab === "password"
                ? "bg-green-600 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <Lock size={18} /> Change Password
          </button>
          <button
            onClick={() => setActiveTab("logout")}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium ${
              activeTab === "logout"
                ? "bg-red-600 text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <LogOut size={18} /> Logout
          </button>
        </aside>

        {/* Content */}
        <section className="flex-1 bg-white rounded-xl shadow-md p-6">
          {activeTab === "basic" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-700">
                <User className="w-5 h-5" /> Basic Information
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  className="border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500"
                  value={user.name || ""}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  placeholder="Full Name"
                />
                <input
                  className="border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500"
                  value={user.email || ""}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  placeholder="Email"
                />
                <input
                  className="border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500"
                  value={user.contact || ""}
                  onChange={(e) => setUser({ ...user, contact: e.target.value })}
                  placeholder="Contact Number"
                />
                <input
                  className="border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500"
                  value={user.shopName || ""}
                  onChange={(e) =>
                    setUser({ ...user, shopName: e.target.value })
                  }
                  placeholder="Shop / Business Name"
                />
                <input
                  className="border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 md:col-span-2"
                  value={user.shopAddress || ""}
                  onChange={(e) =>
                    setUser({ ...user, shopAddress: e.target.value })
                  }
                  placeholder="Shop Address"
                />
              </div>
              <button
                onClick={updateProfile}
                disabled={loading || !isChanged} // ✅ disable if no changes
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow disabled:opacity-50"
              >
                {loading ? "Saving..." : "💾 Save Changes"}
              </button>
            </div>
          )}

          {activeTab === "password" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-700">
                <Lock className="w-5 h-5" /> Change Password
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  className="border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-green-500"
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      oldPassword: e.target.value,
                    })
                  }
                  placeholder="Old Password"
                />
                <input
                  className="border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-green-500"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                  placeholder="New Password"
                />
              </div>
              <button
                onClick={changePassword}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow disabled:opacity-50"
              >
                {loading ? "Updating..." : "🔑 Change Password"}
              </button>
            </div>
          )}

          {activeTab === "logout" && (
            <div className="flex flex-col items-center justify-center gap-4">
              <h2 className="text-xl font-semibold text-gray-700">
                Ready to leave?
              </h2>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg shadow"
              >
                🚪 Logout
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
