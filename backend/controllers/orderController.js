import Order from "../models/Order.js";
import Listing from "../models/Listing.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";

// POST /api/orders
// Called AFTER the buyer's wallet has already signed & submitted
// place_order() on-chain. The backend records the resulting order for
// indexing/search/dashboards; the contract remains the source of truth
// for the actual fund custody and status transitions.
export const createOrder = async (req, res, next) => {
  try {
    const {
      contractOrderId,
      contractListingId,
      listingId,
      quantity,
      amount,
      fundTxHash,
      deliveryDeadline,
    } = req.body;

    if (!req.user.walletAddress) {
      return res.status(400).json({ message: "Connect a Stellar wallet before ordering" });
    }
    if (
      contractOrderId === undefined ||
      contractListingId === undefined ||
      !listingId ||
      !quantity ||
      !amount ||
      !fundTxHash ||
      !deliveryDeadline
    ) {
      return res.status(400).json({ message: "Missing required order fields" });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    const order = await Order.create({
      contractOrderId,
      listing: listing._id,
      contractListingId,
      farmerId: listing.farmerId,
      buyerId: req.user._id,
      farmerWallet: listing.farmerWallet,
      buyerWallet: req.user.walletAddress,
      quantity,
      amount,
      fundTxHash,
      deliveryDeadline,
      status: "funded",
    });

    // Reflect the on-chain quantity deduction in our local index.
    listing.quantityAvailable = Math.max(0, listing.quantityAvailable - quantity);
    await listing.save();

    await AnalyticsEvent.create({
      event: "order_placed",
      userId: req.user._id,
      walletAddress: req.user.walletAddress,
      metadata: { orderId: order._id, contractOrderId, amount },
    });

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/deliver  (farmer, after mark_delivered() on-chain)
export const markDelivered = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.farmerId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the selling farmer can mark this delivered" });
    }

    const { deliveryTxHash, proofHash } = req.body;
    if (!deliveryTxHash) {
      return res.status(400).json({ message: "deliveryTxHash is required" });
    }

    let proofImageUrl = order.proofImageUrl;
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "agropay/proofs" },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      proofImageUrl = uploadResult.secure_url;
    }

    order.status = "delivered";
    order.deliveryTxHash = deliveryTxHash;
    order.proofHash = proofHash || order.proofHash;
    order.proofImageUrl = proofImageUrl;
    await order.save();

    await AnalyticsEvent.create({
      event: "order_delivered",
      userId: req.user._id,
      metadata: { orderId: order._id },
    });

    res.json({ order });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/confirm  (buyer, after confirm_delivery() on-chain)
export const confirmOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.buyerId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the buyer can confirm this order" });
    }

    const { releaseTxHash } = req.body;
    if (!releaseTxHash) {
      return res.status(400).json({ message: "releaseTxHash is required" });
    }

    order.status = "released";
    order.releaseTxHash = releaseTxHash;
    await order.save();

    await AnalyticsEvent.create({
      event: "order_confirmed",
      userId: req.user._id,
      metadata: { orderId: order._id },
    });

    res.json({ order });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/dispute  (buyer, after raise_dispute() on-chain)
export const disputeOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.buyerId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the buyer can dispute this order" });
    }

    order.status = "disputed";
    order.disputeReason = req.body.reason || "No reason provided";
    await order.save();

    await AnalyticsEvent.create({
      event: "dispute_raised",
      userId: req.user._id,
      metadata: { orderId: order._id },
    });

    res.json({ order });
  } catch (err) {
    next(err);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const filter =
      req.user.role === "farmer" ? { farmerId: req.user._id } : { buyerId: req.user._id };

    const orders = await Order.find(filter)
      .populate("listing", "title imageUrl unit")
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate("listing");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const isParty =
      String(order.buyerId) === String(req.user._id) ||
      String(order.farmerId) === String(req.user._id);
    if (!isParty && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
};
