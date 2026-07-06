import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "name, email, password, and role are required" });
    }
    if (!["farmer", "buyer"].includes(role)) {
      return res.status(400).json({ message: "role must be 'farmer' or 'buyer'" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const user = await User.create({ name, email, password, role });
    const token = signToken(user._id);

    await AnalyticsEvent.create({ event: "signup", userId: user._id, metadata: { role } });

    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user._id);
    await AnalyticsEvent.create({ event: "login", userId: user._id });

    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
};

export const linkWallet = async (req, res, next) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || !walletAddress.startsWith("G") || walletAddress.length !== 56) {
      return res.status(400).json({ message: "A valid Stellar public key (G...) is required" });
    }

    req.user.walletAddress = walletAddress;
    await req.user.save();

    await AnalyticsEvent.create({
      event: "wallet_connected",
      userId: req.user._id,
      walletAddress,
    });

    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};
