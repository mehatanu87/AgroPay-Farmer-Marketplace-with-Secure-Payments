import Feedback from "../models/Feedback.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";

export const submitFeedback = async (req, res, next) => {
  try {
    const { rating, message, relatedOrder } = req.body;
    if (!rating || !message) {
      return res.status(400).json({ message: "rating and message are required" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating must be between 1 and 5" });
    }

    const feedback = await Feedback.create({
      userId: req.user._id,
      role: req.user.role === "farmer" ? "farmer" : "buyer",
      rating,
      message,
      relatedOrder: relatedOrder || null,
    });

    await AnalyticsEvent.create({
      event: "feedback_submitted",
      userId: req.user._id,
      metadata: { rating },
    });

    res.status(201).json({ feedback });
  } catch (err) {
    next(err);
  }
};

export const getAllFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.find()
      .populate("userId", "name role")
      .sort({ createdAt: -1 });

    const avgRating =
      feedback.length > 0
        ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(2)
        : 0;

    res.json({ feedback, count: feedback.length, averageRating: Number(avgRating) });
  } catch (err) {
    next(err);
  }
};
