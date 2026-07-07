import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Sprout } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import WalletButton from "./WalletButton";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const dashboardPath =
    user?.role === "farmer" ? "/farmer-dashboard" : user?.role === "admin" ? "/admin" : "/buyer-dashboard";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-agro-700 dark:text-agro-400">
            <Sprout className="h-6 w-6" />
            AgroPay
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/marketplace" className="text-sm font-medium hover:text-agro-600">
              Marketplace
            </Link>
            {user && (
              <Link to={dashboardPath} className="text-sm font-medium hover:text-agro-600">
                Dashboard
              </Link>
            )}
            <Link to="/forum" className="text-sm font-medium hover:text-agro-600">
              Forum
            </Link>
            <Link to="/feedback" className="text-sm font-medium hover:text-agro-600">
              Feedback
            </Link>
            <button 
              onClick={() => document.documentElement.classList.toggle('dark')} 
              className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white"
              title="Toggle Dark Mode"
            >
              🌙
            </button>
            <WalletButton />
            {user ? (
              <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-red-600">
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-full border border-agro-600 text-agro-600 text-sm font-medium hover:bg-agro-50"
              >
                Login
              </Link>
            )}
          </div>

          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800">
          <Link to="/marketplace" onClick={() => setOpen(false)} className="py-2 text-sm font-medium">
            Marketplace
          </Link>
          {user && (
            <Link to={dashboardPath} onClick={() => setOpen(false)} className="py-2 text-sm font-medium">
              Dashboard
            </Link>
          )}
          <Link to="/feedback" onClick={() => setOpen(false)} className="py-2 text-sm font-medium">
            Feedback
          </Link>
          <div className="py-2">
            <WalletButton />
          </div>
          {user ? (
            <button onClick={handleLogout} className="py-2 text-left text-sm font-medium text-red-600">
              Logout
            </button>
          ) : (
            <Link to="/login" onClick={() => setOpen(false)} className="py-2 text-sm font-medium text-agro-600">
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
