import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminApi } from "../services/api";
import { escrowContract } from "../services/contract";
import { useWallet } from "../context/WalletContext";

export default function AdminDashboard() {
  const { publicKey, connect } = useWallet();
  const [stats, setStats] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [events, setEvents] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);

  const loadAll = () => {
    adminApi.getStats().then(({ data }) => setStats(data));
    adminApi.getDisputes().then(({ data }) => setDisputes(data.orders));
    adminApi.getEvents().then(({ data }) => setEvents(data.events));
  };

  useEffect(loadAll, []);

  const handleResolve = async (order, releaseToFarmer) => {
    let wallet = publicKey;
    if (!wallet) {
      try {
        wallet = await connect();
      } catch {
        return;
      }
    }
    setResolvingId(order._id);
    try {
      await escrowContract.resolveDispute(wallet, {
        orderId: order.contractOrderId,
        releaseToFarmer,
      });
      toast.success(`Dispute resolved: ${releaseToFarmer ? "released to farmer" : "refunded to buyer"}`);
      loadAll();
    } catch (err) {
      toast.error(err.message || "Failed to resolve dispute on-chain");
    } finally {
      setResolvingId(null);
    }
  };

  if (!stats) return <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-500">Loading dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat label="Total Users" value={stats.totalUsers} />
        <Stat label="Farmers / Buyers" value={`${stats.totalFarmers} / ${stats.totalBuyers}`} />
        <Stat label="Active Listings" value={stats.activeListings} />
        <Stat label="Total Orders" value={stats.totalOrders} />
        <Stat label="Released Orders" value={stats.releasedOrders} />
        <Stat label="Disputed Orders" value={stats.disputedOrders} />
        <Stat label="Wallets Connected" value={stats.walletsConnected} />
        <Stat label="Total Volume" value={`${stats.totalVolume.toFixed(2)} XLM`} />
      </div>

      <h2 className="font-semibold mb-4">Disputed Orders</h2>
      {disputes.length === 0 ? (
        <p className="text-sm text-gray-500 mb-10">No active disputes.</p>
      ) : (
        <div className="space-y-3 mb-10">
          {disputes.map((order) => (
            <div key={order._id} className="p-4 rounded-xl border border-red-200 bg-red-50/50">
              <p className="text-sm font-medium">{order.listing?.title}</p>
              <p className="text-xs text-gray-500 mb-1">
                Buyer: {order.buyerId?.name} · Farmer: {order.farmerId?.name}
              </p>
              <p className="text-xs text-gray-600 mb-3">Reason: {order.disputeReason}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleResolve(order, true)}
                  disabled={resolvingId === order._id}
                  className="text-xs px-3 py-1.5 rounded-lg bg-agro-600 text-white font-medium"
                >
                  Release to Farmer
                </button>
                <button
                  onClick={() => handleResolve(order, false)}
                  disabled={resolvingId === order._id}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-400 font-medium"
                >
                  Refund Buyer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-semibold mb-4">Recent Activity</h2>
      <div className="space-y-2">
        {events.slice(0, 15).map((e) => (
          <div key={e._id} className="text-xs text-gray-500 flex justify-between border-b border-gray-100 dark:border-gray-800 py-2">
            <span>
              <strong className="text-gray-700 dark:text-gray-300">{e.event}</strong>{" "}
              {e.userId?.name && `by ${e.userId.name}`}
            </span>
            <span>{new Date(e.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-5 rounded-xl border border-gray-100 dark:border-gray-800">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
