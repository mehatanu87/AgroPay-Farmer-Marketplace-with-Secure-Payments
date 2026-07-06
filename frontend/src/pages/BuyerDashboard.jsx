import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { orderApi } from "../services/api";
import { useWallet } from "../context/WalletContext";
import { escrowContract } from "../services/contract";

const STATUS_COLORS = {
  funded: "bg-blue-50 text-blue-700",
  delivered: "bg-yellow-50 text-yellow-700",
  released: "bg-agro-50 text-agro-700",
  disputed: "bg-red-50 text-red-700",
  refunded: "bg-gray-100 text-gray-600",
};

export default function BuyerDashboard() {
  const { publicKey, connect } = useWallet();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const loadOrders = () => {
    setLoading(true);
    orderApi
      .getMine()
      .then(({ data }) => setOrders(data.orders))
      .finally(() => setLoading(false));
  };

  useEffect(loadOrders, []);

  const withWallet = async (fn) => {
    let wallet = publicKey;
    if (!wallet) {
      try {
        wallet = await connect();
      } catch {
        return;
      }
    }
    return fn(wallet);
  };

  const handleConfirm = (order) =>
    withWallet(async (wallet) => {
      setActingId(order._id);
      try {
        const { hash } = await escrowContract.confirmDelivery(wallet, { orderId: order.contractOrderId });
        await orderApi.confirm(order._id, hash);
        toast.success("Delivery confirmed — funds released to farmer");
        loadOrders();
      } catch (err) {
        toast.error(err.message || err.response?.data?.message || "Failed to confirm");
      } finally {
        setActingId(null);
      }
    });

  const handleDispute = (order) =>
    withWallet(async (wallet) => {
      const reason = window.prompt("Briefly describe the issue with this order:");
      if (!reason) return;
      setActingId(order._id);
      try {
        await escrowContract.raiseDispute(wallet, { orderId: order.contractOrderId });
        await orderApi.dispute(order._id, reason);
        toast.success("Dispute raised — an admin will review it");
        loadOrders();
      } catch (err) {
        toast.error(err.message || err.response?.data?.message || "Failed to raise dispute");
      } finally {
        setActingId(null);
      }
    });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">My Orders</h1>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-gray-500">You haven't placed any orders yet.</p>
      ) : (
        <div className="space-y-3">
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
                {order.proofImageUrl && (
                  <a
                    href={order.proofImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-agro-600 underline"
                  >
                    View delivery proof
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${STATUS_COLORS[order.status]}`}>
                  {order.status}
                </span>
                {order.status === "delivered" && (
                  <>
                    <button
                      onClick={() => handleConfirm(order)}
                      disabled={actingId === order._id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-agro-600 hover:bg-agro-700 disabled:opacity-60 text-white font-medium"
                    >
                      Confirm Receipt
                    </button>
                    <button
                      onClick={() => handleDispute(order)}
                      disabled={actingId === order._id}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-600 font-medium"
                    >
                      Dispute
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
