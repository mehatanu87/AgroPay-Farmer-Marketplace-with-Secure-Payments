import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      enum: [
        "wallet_connected",
        "listing_created",
        "order_placed",
        "order_delivered",
        "order_confirmed",
        "dispute_raised",
        "feedback_submitted",
        "signup",
        "login",
      ],
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    walletAddress: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("AnalyticsEvent", analyticsEventSchema);
