import mongoose, { Model, Schema } from "mongoose";
import { IBid } from "./types";

// Define bid status enum to match the bot
export enum BidStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
}

// Define bid source enum to match the bot
export enum BidSource {
  PHONE = "phone",
  WEBAPP = "webapp",
  UNKNOWN = "unknown",
}

const BidSchema: Schema = new Schema(
  {
    // Web app specific fields
    bidId: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined values
    },

    // Fields from bot model
    travelerId: {
      type: Schema.Types.Mixed, // Support both string (web) and number (bot)
      required: true,
      ref: "User",
    },
    listingId: {
      type: Schema.Types.Mixed, // Support both string (web) and ObjectId (bot)
      required: true,
      ref: "Listing",
    },
    proposedFee: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(BidStatus),
      default: BidStatus.PENDING,
    },

    source: {
      type: String,
      enum: Object.values(BidSource),
      default: BidSource.UNKNOWN,
    },

    // Web app specific fields
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create the model only if it doesn't exist or we're not in a server context
// Note: The bot doesn't specify a collection name, so we use the default 'bids'
const Bid = mongoose.models.Bid || mongoose.model<IBid>("Bid", BidSchema);

export default Bid as Model<IBid>;
