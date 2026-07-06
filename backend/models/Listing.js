import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
  {
    contractListingId: { type: Number, required: true, unique: true, index: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    farmerWallet: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["grains", "vegetables", "fruits", "dairy", "spices", "other"],
      default: "other",
    },
    pricePerUnit: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true }, // e.g. "kg", "bag", "crate"
    quantityAvailable: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, default: null },
    location: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

listingSchema.index({ title: "text", description: "text", category: 1 });

export default mongoose.model("Listing", listingSchema);
