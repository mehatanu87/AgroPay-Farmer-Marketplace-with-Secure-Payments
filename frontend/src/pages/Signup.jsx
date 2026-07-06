import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "buyer" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await signup(form);
      toast.success("Account created!");
      navigate(user.role === "farmer" ? "/farmer-dashboard" : "/buyer-dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Join AgroPay</h1>
        <p className="text-gray-500 mb-6 text-sm">Create your account to get started</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, role: "buyer" })}
              className={`py-2 rounded-lg border text-sm font-medium ${
                form.role === "buyer"
                  ? "border-agro-600 bg-agro-50 text-agro-700"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            >
              I'm a Buyer
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, role: "farmer" })}
              className={`py-2 rounded-lg border text-sm font-medium ${
                form.role === "farmer"
                  ? "border-agro-600 bg-agro-50 text-agro-700"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            >
              I'm a Farmer
            </button>
          </div>

          <div>
            <label className="text-sm font-medium">Full name</label>
            <input
              required
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-agro-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-agro-500"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-agro-500"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-agro-600 hover:bg-agro-700 disabled:opacity-60 text-white font-medium text-sm transition-colors"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-agro-600 font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
