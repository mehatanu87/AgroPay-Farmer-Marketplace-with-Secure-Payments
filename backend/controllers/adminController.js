import User from "../models/User.js";
import Listing from "../models/Listing.js";
import Order from "../models/Order.js";
import Feedback from "../models/Feedback.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";

export const verifyFarmer = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== "farmer") {
      return res.status(404).json({ message: "Farmer not found" });
    }
    user.verified = req.body.verified !== undefined ? req.body.verified : true;
    await user.save();
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalFarmers,
      totalBuyers,
      totalListings,
      activeListings,
      totalOrders,
      releasedOrders,
      disputedOrders,
      feedbackCount,
      walletsConnected,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "farmer" }),
      User.countDocuments({ role: "buyer" }),
      Listing.countDocuments(),
      Listing.countDocuments({ active: true }),
      Order.countDocuments(),
      Order.countDocuments({ status: "released" }),
      Order.countDocuments({ status: "disputed" }),
      Feedback.countDocuments(),
      User.countDocuments({ walletAddress: { $ne: null } }),
    ]);

    const volumeAgg = await Order.aggregate([
      { $match: { status: { $in: ["released", "delivered", "funded"] } } },
      { $group: { _id: null, totalVolume: { $sum: "$amount" } } },
    ]);

    res.json({
      totalUsers,
      totalFarmers,
      totalBuyers,
      totalListings,
      activeListings,
      totalOrders,
      releasedOrders,
      disputedOrders,
      feedbackCount,
      walletsConnected,
      totalVolume: volumeAgg[0]?.totalVolume || 0,
    });
  } catch (err) {
    next(err);
  }
};

export const getRecentEvents = async (req, res, next) => {
  try {
    const events = await AnalyticsEvent.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("userId", "name role");
    res.json({ events });
  } catch (err) {
    next(err);
  }
};

export const getDisputedOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ status: "disputed" })
      .populate("listing", "title")
      .populate("farmerId", "name walletAddress")
      .populate("buyerId", "name walletAddress")
      .sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
};
