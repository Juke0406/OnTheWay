import mongoose, { Model, Schema } from "mongoose";
import { IReview } from "./types";

const ReviewSchema: Schema = new Schema(
  {
    // Web app specific fields
    reviewId: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined values
    },

    // Fields from bot model
    fromUserId: {
      type: Schema.Types.Mixed, // Support both string (web) and number (bot)
      required: true,
      ref: "User",
    },
    toUserId: {
      type: Schema.Types.Mixed, // Support both string (web) and number (bot)
      required: true,
      ref: "User",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
    },
    listingId: {
      type: Schema.Types.Mixed, // Support both string (web) and ObjectId (bot)
      required: true,
      ref: "Listing",
    },
  },
  {
    timestamps: true,
  }
);

// Create the model only if it doesn't exist or we're not in a server context
const Review =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);

export default Review as Model<IReview>;
