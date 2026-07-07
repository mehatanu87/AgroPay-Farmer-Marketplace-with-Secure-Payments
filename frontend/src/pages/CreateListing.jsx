import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { listingApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import { escrowContract } from "../services/contract";

// Category images — using source.unsplash.com which always returns a real image
const CATEGORY_IMAGES = {
  grains: [
    { label: "Wheat",   url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300&h=200&fit=crop" },
    { label: "Rice",    url: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=300&h=200&fit=crop" },
    { label: "Corn",    url: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=300&h=200&fit=crop" },
    { label: "Barley",  url: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=300&h=200&fit=crop" },
    { label: "Millet",  url: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=300&h=200&fit=crop" },
    { label: "Oats",    url: "https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=300&h=200&fit=crop" },
    { label: "Sorghum", url: "https://images.unsplash.com/photo-1635693256035-e77e89e80f92?w=300&h=200&fit=crop" },
  ],
  vegetables: [
    { label: "Tomatoes",    url: "https://images.unsplash.com/photo-1561136585-c5a0b8bd0168?w=300&h=200&fit=crop" },
    { label: "Potatoes",    url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300&h=200&fit=crop" },
    { label: "Onions",      url: "https://images.unsplash.com/photo-1620574387735-3624d75b2dbc?w=300&h=200&fit=crop" },
    { label: "Spinach",     url: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=300&h=200&fit=crop" },
    { label: "Carrots",     url: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=300&h=200&fit=crop" },
    { label: "Cauliflower", url: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=300&h=200&fit=crop" },
    { label: "Brinjal",     url: "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=300&h=200&fit=crop" },
  ],
  fruits: [
    { label: "Mango",       url: "https://images.unsplash.com/photo-1605027990121-cbae9e0642df?w=300&h=200&fit=crop" },
    { label: "Banana",      url: "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=300&h=200&fit=crop" },
    { label: "Apple",       url: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=200&fit=crop" },
    { label: "Grapes",      url: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=300&h=200&fit=crop" },
    { label: "Papaya",      url: "https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=300&h=200&fit=crop" },
    { label: "Pomegranate", url: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=300&h=200&fit=crop" },
    { label: "Guava",       url: "https://images.unsplash.com/photo-1536424289700-36b80c57ef51?w=300&h=200&fit=crop" },
  ],
  dairy: [
    { label: "Fresh Milk",  url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&h=200&fit=crop" },
    { label: "Paneer",      url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&h=200&fit=crop" },
    { label: "Ghee",        url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop" },
    { label: "Butter",      url: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&h=200&fit=crop" },
    { label: "Curd/Yogurt", url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&h=200&fit=crop" },
    { label: "Cheese",      url: "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=300&h=200&fit=crop" },
  ],
  spices: [
    { label: "Turmeric",    url: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=300&h=200&fit=crop&q=80&sat=-100" },
    { label: "Chilli",      url: "https://images.unsplash.com/photo-1526346698789-22fd84314424?w=300&h=200&fit=crop" },
    { label: "Coriander",   url: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=300&h=200&fit=crop" },
    { label: "Cumin",       url: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&h=200&fit=crop" },
    { label: "Black Pepper",url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop" },
    { label: "Cardamom",    url: "https://images.unsplash.com/photo-1599909533731-5c3b5a1a2b4f?w=300&h=200&fit=crop" },
    { label: "Ginger",      url: "https://images.unsplash.com/photo-1615485291234-9d694218aeb3?w=300&h=200&fit=crop" },
  ],
  other: [
    { label: "Sugarcane",  url: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&h=200&fit=crop&flip=h" },
    { label: "Cotton",     url: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=300&h=200&fit=crop" },
    { label: "Groundnut",  url: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=300&h=200&fit=crop" },
    { label: "Sunflower",  url: "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=300&h=200&fit=crop" },
    { label: "Coconut",    url: "https://images.unsplash.com/photo-1560472355-536de3962603?w=300&h=200&fit=crop" },
    { label: "Farm Fresh", url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=300&h=200&fit=crop" },
  ],
};

const CATEGORIES = Object.keys(CATEGORY_IMAGES);

export default function CreateListing() {
  const { user } = useAuth();
  const { publicKey, connect, refreshBalance } = useWallet();
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

  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [customImage, setCustomImage] = useState(null);
  const [imageMode, setImageMode] = useState("preset"); // "preset" | "upload"
  const [submitting, setSubmitting] = useState(false);

  // Reset selected preset image when category changes
  useEffect(() => {
    setSelectedImageUrl(null);
  }, [form.category]);

  const currentImages = CATEGORY_IMAGES[form.category] || [];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (imageMode === "preset" && !selectedImageUrl) {
      toast.error("Please select an image for your listing.");
      return;
    }

    let wallet = publicKey || user?.walletAddress;
    if (!wallet) {
      try { wallet = await connect(); } catch { return; }
    }

    setSubmitting(true);
    try {
      const { returnValue: contractListingId } = await escrowContract.createListing(wallet, {
        title: form.title,
        pricePerUnit: Number(form.pricePerUnit),
        unit: form.unit,
        quantityAvailable: Number(form.quantityAvailable),
      });

      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("contractListingId", contractListingId);

      if (imageMode === "preset" && selectedImageUrl) {
        fd.append("imageUrl", selectedImageUrl);
      } else if (imageMode === "upload" && customImage) {
        fd.append("image", customImage);
      }

      await listingApi.create(fd);
      refreshBalance(); // update XLM balance after on-chain tx
      toast.success("Listing created and live on-chain!");
      navigate("/farmer-dashboard");
    } catch (err) {
      toast.error(err.message || err.response?.data?.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">List Your Produce</h1>
      <p className="text-sm text-gray-500 mb-6">Fill in the details and pick a photo for your listing.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
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

        {/* Description */}
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* Category + Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Category</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
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

        {/* Price + Quantity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Price per unit (XLM)</label>
            <input
              type="number" required min="0.01" step="0.01"
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              value={form.pricePerUnit}
              onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Quantity available</label>
            <input
              type="number" required min="1"
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              value={form.quantityAvailable}
              onChange={(e) => setForm({ ...form, quantityAvailable: e.target.value })}
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="text-sm font-medium">Farm location</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>

        {/* ── Image Picker ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Product Photo</label>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setImageMode("preset")}
                className={`px-3 py-1 rounded-full border transition-colors ${imageMode === "preset" ? "bg-agro-600 text-white border-agro-600" : "border-gray-300 dark:border-gray-600 text-gray-500"}`}
              >
                Choose preset
              </button>
              <button
                type="button"
                onClick={() => setImageMode("upload")}
                className={`px-3 py-1 rounded-full border transition-colors ${imageMode === "upload" ? "bg-agro-600 text-white border-agro-600" : "border-gray-300 dark:border-gray-600 text-gray-500"}`}
              >
                Upload my own
              </button>
            </div>
          </div>

          {imageMode === "preset" ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {currentImages.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setSelectedImageUrl(img.url)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-video focus:outline-none ${
                    selectedImageUrl === img.url
                      ? "border-agro-500 ring-2 ring-agro-400 scale-105"
                      : "border-transparent hover:border-agro-300"
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.label}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://placehold.co/300x200/4a7c59/ffffff?text=${encodeURIComponent(img.label)}`;
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[10px] py-0.5 text-center truncate px-1">
                    {img.label}
                  </div>
                  {selectedImageUrl === img.url && (
                    <div className="absolute top-1 right-1 bg-agro-500 rounded-full w-4 h-4 flex items-center justify-center text-white text-[10px]">✓</div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-1">
              <input
                type="file"
                accept="image/*"
                className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2"
                onChange={(e) => setCustomImage(e.target.files[0])}
              />
              {customImage && (
                <img
                  src={URL.createObjectURL(customImage)}
                  alt="preview"
                  className="mt-2 rounded-lg h-32 object-cover"
                />
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg bg-agro-600 hover:bg-agro-700 disabled:opacity-60 text-white font-medium text-sm transition-colors"
        >
          {submitting ? "Confirm in wallet..." : "Create Listing"}
        </button>
      </form>
    </div>
  );
}
