import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { listingApi, orderApi } from "../services/api";
import { useWallet } from "../context/WalletContext";
import { escrowContract } from "../services/contract";

const STATUS_COLORS = {
  funded: "bg-blue-50 text-blue-700",
  delivered: "bg-yellow-50 text-yellow-700",
  released: "bg-agro-50 text-agro-700",
  disputed: "bg-red-50 text-red-700",
  refunded: "bg-gray-100 text-gray-600",
};

export default function FarmerDashboard() {
  const { publicKey, connect } = useWallet();
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deliveringId, setDeliveringId] = useState(null);
  const [proofFile, setProofFile] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([listingApi.getMine(), orderApi.getMine()])
      .then(([l, o]) => {
        setListings(l.data.listings);
        setOrders(o.data.orders);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  const handleMarkDelivered = async (order) => {
    let wallet = publicKey;
    if (!wallet) {
      try {
        wallet = await connect();
      } catch {
        return;
      }
    }
    setDeliveringId(order._id);
    try {
      const proofHash = proofFile ? `proof:${proofFile.name}:${Date.now()}` : `proof:${Date.now()}`;

      const { hash } = await escrowContract.markDelivered(wallet, {
        orderId: order.contractOrderId,
        proofHash,
      });

      const fd = new FormData();
      fd.append("deliveryTxHash", hash);
      fd.append("proofHash", proofHash);
      if (proofFile) fd.append("proof", proofFile);

      await orderApi.markDelivered(order._id, fd);
      toast.success("Marked as delivered");
      loadData();
    } catch (err) {
      toast.error(err.message || err.response?.data?.message || "Failed to mark delivered");
    } finally {
      setDeliveringId(null);
      setProofFile(null);
    }
  };

  const totalRevenue = orders
    .filter((o) => o.status === "released")
    .reduce((sum, o) => sum + o.amount, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Farmer Dashboard</h1>
        <Link
          to="/create-campaign"
          className="px-4 py-2 rounded-lg bg-agro-600 hover:bg-agro-700 text-white text-sm font-medium"
        >
          + New Listing
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Active Listings" value={listings.filter((l) => l.active).length} />
        <StatCard label="Total Orders" value={orders.length} />
        <StatCard label="Revenue Released" value={`${totalRevenue.toFixed(2)} XLM`} />
      </div>

      <h2 className="font-semibold mb-4">Incoming Orders</h2>
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-gray-500 mb-10">No orders yet.</p>
      ) : (
        <div className="space-y-3 mb-10">
          {orders.map((order) => (
            <div
              key={order._id}
              className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-medium">{order.listing?.title}</p>
                <p className="text-xs text-gray-500">
                  {order.quantity} × {order.listing?.unit} · {order.amount} XLM
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${STATUS_COLORS[order.status]}`}>
                  {order.status}
                </span>
                {order.status === "funded" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="text-xs max-w-[120px]"
                      onChange={(e) => setProofFile(e.target.files[0])}
                    />
                    <button
                      onClick={() => handleMarkDelivered(order)}
                      disabled={deliveringId === order._id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-agro-600 hover:bg-agro-700 disabled:opacity-60 text-white font-medium"
                    >
                      {deliveringId === order._id ? "Confirming..." : "Mark Delivered"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-semibold mb-4">My Listings</h2>
      {listings.length === 0 ? (
        <p className="text-sm text-gray-500">You haven't listed any produce yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <div key={listing._id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              <p className="text-sm font-semibold">{listing.title}</p>
              <p className="text-xs text-gray-500">
                {listing.pricePerUnit} XLM / {listing.unit} · {listing.quantityAvailable} left
              </p>
              <span
                className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  listing.active ? "bg-agro-50 text-agro-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {listing.active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="p-5 rounded-xl border border-gray-100 dark:border-gray-800">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
