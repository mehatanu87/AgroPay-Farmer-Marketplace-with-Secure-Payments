import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { listingApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import { escrowContract } from "../services/contract";

const CATEGORIES = ["grains", "vegetables", "fruits", "dairy", "spices", "other"];

export default function CreateListing() {
  const { user } = useAuth();
  const { publicKey, connect } = useWallet();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "vegetables",
    pricePerUnit: "",
    unit: "kg",
    quantityAvailable: "",
    location: "",
  });
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let wallet = publicKey || user?.walletAddress;
    if (!wallet) {
      try {
        wallet = await connect();
      } catch {
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. Create the listing on-chain first — this is the source of truth.
      const { returnValue: contractListingId } = await escrowContract.createListing(wallet, {
        title: form.title,
        pricePerUnit: Number(form.pricePerUnit),
        unit: form.unit,
        quantityAvailable: Number(form.quantityAvailable),
      });

      // 2. Index it in the backend with the resulting on-chain ID.
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("contractListingId", contractListingId);
      if (image) fd.append("image", image);

      await listingApi.create(fd);
      toast.success("Listing created and live on-chain!");
      navigate("/farmer-dashboard");
    } catch (err) {
      toast.error(err.message || err.response?.data?.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">List Your Produce</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Title</label>
          <input
            required
            placeholder="e.g. Organic Tomatoes"
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Category</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Unit</label>
            <input
              required
              placeholder="kg, bag, crate..."
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Price per unit (XLM)</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              value={form.pricePerUnit}
              onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Quantity available</label>
            <input
              type="number"
              required
              min="1"
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              value={form.quantityAvailable}
              onChange={(e) => setForm({ ...form, quantityAvailable: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Farm location</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Photo</label>
          <input
            type="file"
            accept="image/*"
            className="mt-1 w-full text-sm"
            onChange={(e) => setImage(e.target.files[0])}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg bg-agro-600 hover:bg-agro-700 disabled:opacity-60 text-white font-medium text-sm"
        >
          {submitting ? "Confirm in wallet..." : "Create Listing"}
        </button>
      </form>
    </div>
  );
}
