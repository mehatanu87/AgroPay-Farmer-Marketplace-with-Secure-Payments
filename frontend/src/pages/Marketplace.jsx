import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { listingApi } from "../services/api";

const CATEGORIES = ["all", "grains", "vegetables", "fruits", "dairy", "spices", "other"];

export default function Marketplace() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      listingApi
        .getAll({ search: search || undefined, category: category === "all" ? undefined : category })
        .then(({ data }) => setListings(data.listings))
        .catch(() => setListings([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, category]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Marketplace</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            placeholder="Search produce..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-agro-500"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c[0].toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-20">No listings found. Try a different search.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Link
              key={listing._id}
              to={`/campaign/${listing._id}`}
              className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="h-40 bg-gray-100 dark:bg-gray-800">
                {listing.imageUrl ? (
                  <img src={listing.imageUrl} alt={listing.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">
                    No image
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm">{listing.title}</h3>
                  {listing.farmerId?.verified && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-agro-50 text-agro-700 font-semibold">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-2">{listing.farmerId?.location || "Location N/A"}</p>
                <p className="text-sm font-bold text-agro-700">
                  {listing.pricePerUnit} XLM <span className="text-gray-400 font-normal">/ {listing.unit}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">{listing.quantityAvailable} {listing.unit} available</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
