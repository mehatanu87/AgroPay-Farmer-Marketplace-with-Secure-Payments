import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { listingApi, orderApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import { escrowContract } from "../services/contract";

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { publicKey, connect } = useWallet();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [deliveryDays, setDeliveryDays] = useState(7);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    listingApi
      .getById(id)
      .then(({ data }) => setListing(data.listing))
      .catch(() => toast.error("Listing not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBuy = async () => {
    if (!user) {
      toast.error("Please log in to place an order");
      return navigate("/login");
    }
    if (user.role !== "buyer") {
      return toast.error("Only buyer accounts can place orders");
    }

    let wallet = publicKey;
    if (!wallet) {
      try {
        wallet = await connect();
      } catch {
        return; // connect() already toasts the error
      }
    }

    setPlacing(true);
    try {
      // 1. Call the on-chain escrow contract — this is what actually
      //    moves and locks the buyer's funds.
      const { hash, returnValue: contractOrderId } = await escrowContract.placeOrder(wallet, {
        listingId: listing.contractListingId,
        quantity,
        deliveryWindowDays: deliveryDays,
      });

      // 2. Index the resulting order in the backend for dashboards/search.
      const { data } = await orderApi.create({
        listingId: listing._id,
        contractListingId: listing.contractListingId,
        contractOrderId,
        quantity: Number(quantity),
        amount: Number(listing.pricePerUnit * quantity),
        deliveryWindowDays: Number(deliveryDays),
        fundTxHash: hash,
      });

      toast.success(
        <span>
          Order placed and funds locked!{" "}
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold"
          >
            View on Explorer
          </a>
        </span>,
        { duration: 6000 }
      );
      navigate(`/buyer-dashboard`, { state: { newOrderId: data.order._id } });
    } catch (err) {
      toast.error(err.message || err.response?.data?.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">Loading...</div>;
  if (!listing) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">Listing not found.</div>;

  const total = (listing.pricePerUnit * quantity).toFixed(2);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 grid sm:grid-cols-2 gap-8">
      <div className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 h-72 sm:h-full">
        {listing.imageUrl ? (
          <img src={listing.imageUrl} alt={listing.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">{listing.title}</h1>
          {listing.farmerId?.verified && (
            <span className="text-xs px-2 py-1 rounded-full bg-agro-50 text-agro-700 font-semibold">
              Verified Farmer
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-agro-100 dark:bg-agro-900 flex items-center justify-center text-agro-600 dark:text-agro-400 font-bold">
            {listing.farmerId?.name?.charAt(0) || "F"}
          </div>
          <div>
            <p className="font-medium">{listing.farmerId?.name || "Farmer"}</p>
            <div className="flex items-center text-xs text-gray-500 gap-1">
              <span className="text-yellow-400">★★★★★</span>
              <span>5.0 (42 reviews)</span>
              <span className="mx-1">•</span>
              <span>{listing.farmerId?.walletAddress?.slice(0, 6)}...{listing.farmerId?.walletAddress?.slice(-4)}</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Sold by {listing.farmerId?.name} · {listing.farmerId?.location || "Location N/A"}
        </p>
        <p className="text-sm mb-6">{listing.description || "No description provided."}</p>

        <p className="text-2xl font-bold text-agro-700 mb-1">
          {listing.pricePerUnit} XLM <span className="text-gray-400 text-sm font-normal">/ {listing.unit}</span>
        </p>
        <p className="text-xs text-gray-400 mb-6">{listing.quantityAvailable} {listing.unit} available</p>

        <div className="space-y-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Quantity ({listing.unit})</label>
            <input
              type="number"
              min={1}
              max={listing.quantityAvailable}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(Number(e.target.value), listing.quantityAvailable)))}
              className="w-20 text-right rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Delivery window (days)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(Number(e.target.value))}
              className="w-20 text-right rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-sm font-bold">{total} XLM</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBuy}
              disabled={placing || listing.quantityAvailable === 0}
              className="w-full py-3 rounded-lg bg-agro-600 hover:bg-agro-700 disabled:opacity-60 text-white font-medium text-sm"
            >
              {placing
                ? "Confirm in wallet..."
                : listing.quantityAvailable === 0
                ? "Out of stock"
                : "Buy — Pay into Escrow (V9)"}
            </button>
            <button
              onClick={() => toast.success("Negotiation feature coming soon!")}
              className="w-full py-3 rounded-lg border border-agro-600 text-agro-600 hover:bg-agro-50 font-medium text-sm"
            >
              Make an Offer
            </button>
          </div>
          <button 
            onClick={() => toast.success("Chat feature coming soon!")}
            className="w-full py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Message Farmer
          </button>
          <p className="text-xs text-gray-400 text-center">
            Funds are locked in the AgroPay escrow contract and only released to the farmer once you confirm delivery.
          </p>
        </div>
      </div>
    </div>
  );
}
