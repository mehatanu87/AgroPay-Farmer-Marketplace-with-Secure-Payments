import Listing from "../models/Listing.js";
import cloudinary from "../config/cloudinary.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";

// GET /api/listings?search=&category=&page=&limit=
export const getListings = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 12 } = req.query;
    const query = { active: true };

    if (category) query.category = category;
    if (search) query.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .populate("farmerId", "name verified location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Listing.countDocuments(query),
    ]);

    res.json({ listings, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

export const getListingById = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id).populate(
      "farmerId",
      "name verified location walletAddress"
    );
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.json({ listing });
  } catch (err) {
    next(err);
  }
};

// POST /api/listings  (farmer only)
// NOTE: contractListingId must come from the client after the on-chain
// create_listing() call succeeds — the backend indexes it, it does not
// create it on-chain itself.
export const createListing = async (req, res, next) => {
  try {
    const {
      txHash,
      title,
      description,
      category,
      pricePerUnit,
      unit,
      quantityAvailable,
      location,
    } = req.body;

    if (!req.user.walletAddress) {
      return res.status(400).json({ message: "Connect a Stellar wallet before creating a listing" });
    }
    if (!txHash || !title || !pricePerUnit || !unit || quantityAvailable === undefined) {
      return res.status(400).json({ message: "Missing required listing fields" });
    }

    // Verify transaction and extract contractListingId
    const { rpc, scValToNative } = await import('@stellar/stellar-sdk');
    const server = new rpc.Server("https://soroban-testnet.stellar.org", { allowHttp: false });
    
    let txResult;
    try {
      // Basic poll since frontend sends it immediately after sendTransaction
      for (let i = 0; i < 15; i++) {
        txResult = await server.getTransaction(txHash);
        if (txResult.status !== "NOT_FOUND") break;
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e) {
      return res.status(500).json({ message: "Failed to verify transaction on blockchain" });
    }

    if (!txResult || txResult.status !== "SUCCESS") {
      return res.status(400).json({ message: "Transaction was not successful on the blockchain" });
    }

    if (!txResult.returnValue) {
      return res.status(400).json({ message: "Transaction did not return a contractListingId" });
    }

    const contractListingId = Number(scValToNative(txResult.returnValue));

    let imageUrl = null;
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "agropay/listings" },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      imageUrl = uploadResult.secure_url;
    }

    const listing = await Listing.create({
      contractListingId,
      farmerId: req.user._id,
      farmerWallet: req.user.walletAddress,
      title,
      description,
      category,
      pricePerUnit,
      unit,
      quantityAvailable,
      location,
      imageUrl,
    });

    await AnalyticsEvent.create({
      event: "listing_created",
      userId: req.user._id,
      walletAddress: req.user.walletAddress,
      metadata: { listingId: listing._id, contractListingId },
    });

    res.status(201).json({ listing });
  } catch (err) {
    next(err);
  }
};

export const updateListingStatus = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (String(listing.farmerId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to modify this listing" });
    }

    listing.active = req.body.active;
    await listing.save();
    res.json({ listing });
  } catch (err) {
    next(err);
  }
};

export const getMyListings = async (req, res, next) => {
  try {
    const listings = await Listing.find({ farmerId: req.user._id }).sort({ createdAt: -1 });
    res.json({ listings });
  } catch (err) {
    next(err);
  }
};
