import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { WalletProvider } from "./context/WalletContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Marketplace from "./pages/Marketplace";
import ListingDetail from "./pages/ListingDetail";
import CreateListing from "./pages/CreateListing";
import FarmerDashboard from "./pages/FarmerDashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Feedback from "./pages/Feedback";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/campaign/:id" element={<ListingDetail />} />
            <Route path="/feedback" element={<Feedback />} />

            <Route
              path="/create-campaign"
              element={
                <ProtectedRoute allowedRoles={["farmer"]}>
                  <CreateListing />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer-dashboard"
              element={
                <ProtectedRoute allowedRoles={["farmer"]}>
                  <FarmerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyer-dashboard"
              element={
                <ProtectedRoute allowedRoles={["buyer"]}>
                  <BuyerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
          <footer className="mt-20 py-8 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-sm text-gray-500 mb-2">© 2026 AgroPay. Built on Stellar.</p>
            <button onClick={() => window.alert('Mobile app links coming soon!')} className="text-agro-600 hover:underline text-sm font-medium">Download Mobile App (iOS / Android)</button>
          </footer>
        </BrowserRouter>
      </WalletProvider>
    </AuthProvider>
  );
}
