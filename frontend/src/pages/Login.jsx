import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}`);
      navigate(user.role === "farmer" ? "/farmer-dashboard" : user.role === "admin" ? "/admin" : "/buyer-dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-gray-500 mb-6 text-sm">Log in to your AgroPay account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-gray-500">
          Don't have an account?{" "}
          <Link to="/signup" className="text-agro-600 font-medium">
            Sign up
          </Link>
        </p>

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            New to Web3? 
            <a href="https://www.youtube.com/watch?v=tutorial" target="_blank" rel="noreferrer" className="ml-1 font-semibold underline">
              Watch our Wallet Setup Tutorial
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
