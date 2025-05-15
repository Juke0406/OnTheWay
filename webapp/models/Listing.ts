import mongoose, { Model, Schema } from "mongoose";
import { IListing } from "./types";

// Define listing status enum to match the bot
export enum ListingStatus {
  OPEN = "open",
  MATCHED = "matched",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

const ListingSchema: Schema = new Schema(
  {
    // Web app specific fields
    listingId: {
      type: String,
      required: true,
      unique: true,
    },

    // Fields from bot model
    buyerId: {
      type: Schema.Types.Mixed, // Support both string (web) and number (bot)
      required: true,
      ref: "User",
    },
    itemDescription: {
      type: String,
      required: true,
    },
    itemPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    maxFee: {
      type: Number,
      required: true,
      min: 0,
    },

    // Location fields - support both formats
    pickupLocation: {
      type: Schema.Types.Mixed,
      // Support both bot format and web format
      validate: {
        validator: function (v: any) {
          // Bot format
          if (
            v &&
            typeof v === "object" &&
            "latitude" in v &&
            "longitude" in v
          ) {
            return true;
          }
          // Web format
          if (
            v &&
            typeof v === "object" &&
            "address" in v &&
            "coordinates" in v
          ) {
            return true;
          }
          return false;
        },
        message: "Invalid pickup location format",
      },
    },
    destinationLocation: {
      type: Schema.Types.Mixed,
      // Support both bot format and web format
      validate: {
        validator: function (v: any) {
          // Bot format
          if (
            v &&
            typeof v === "object" &&
            "latitude" in v &&
            "longitude" in v
          ) {
            return true;
          }
          // Web format
          if (
            v &&
            typeof v === "object" &&
            "address" in v &&
            "coordinates" in v
          ) {
            return true;
          }
          return false;
        },
        message: "Invalid destination location format",
      },
    },

    // Common fields
    status: {
      type: String,
      enum: Object.values(ListingStatus),
      default: ListingStatus.OPEN,
    },
    acceptedBidId: {
      type: Schema.Types.Mixed, // Support both string (web) and ObjectId (bot)
      ref: "Bid",
    },
    travelerId: {
      type: Schema.Types.Mixed, // Support both string (web) and number (bot)
      ref: "User",
    },
    otpBuyer: {
      type: String,
    },
    otpTraveler: {
      type: String,
    },

    // Additional bot fields
    buyerConfirmed: {
      type: Boolean,
      default: false,
    },
    travelerConfirmed: {
      type: Boolean,
      default: false,
    },
    deliveryConfirmed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create the model only if it doesn't exist or we're not in a server context
const Listing =
  mongoose.models.Listing || mongoose.model<IListing>("Listing", ListingSchema);

export default Listing as Model<IListing>;
