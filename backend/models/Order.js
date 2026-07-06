import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    contractOrderId: { type: Number, required: true, unique: true, index: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    contractListingId: { type: Number, required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    farmerWallet: { type: String, required: true },
    buyerWallet: { type: String, required: true },
    quantity: { type: Number, required: true },
    amount: { type: Number, required: true }, // total price in payment token units
    status: {
      type: String,
      enum: ["funded", "delivered", "released", "disputed", "refunded", "cancelled"],
      default: "funded",
    },
    fundTxHash: { type: String, required: true },
    deliveryTxHash: { type: String, default: null },
    releaseTxHash: { type: String, default: null },
    proofImageUrl: { type: String, default: null },
    proofHash: { type: String, default: null },
    deliveryDeadline: { type: Date, required: true },
    disputeReason: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
