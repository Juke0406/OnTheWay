import mongoose, { Model, Schema } from "mongoose";
import { IUser } from "./types";

// Define conversation state enum to match the bot
export enum ConversationState {
  IDLE = "idle",
  CREATING_LISTING = "creating_listing",
  SETTING_AVAILABILITY = "setting_availability",
  BIDDING = "bidding",
  CONFIRMING_DELIVERY = "confirming_delivery",
  RATING = "rating",
  VIEWING_LISTINGS = "viewing_listings",
  TOPUP = "topup",
}

const CONVERSATION_STATES = Object.values(ConversationState);

const UserSchema: Schema = new Schema(
  {
    // Web app specific fields
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
    },
    image: {
      type: String,
    },

    // Fields from bot model
    telegramId: {
      type: Number,
      unique: true,
      sparse: true,
    },
    username: {
      type: String,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },

    // Bot state management fields
    state: {
      type: String,
      enum: CONVERSATION_STATES,
      default: ConversationState.IDLE,
    },
    currentStep: {
      type: String,
    },
    listingData: {
      itemDescription: { type: String },
      itemPrice: { type: Number },
      maxFee: { type: Number },
      pickupLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
      destinationLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
    availabilityData: {
      isAvailable: { type: Boolean, default: false },
      radius: { type: Number },
      location: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
      isLiveLocation: { type: Boolean },
    },
    currentListingId: {
      type: String,
    },
    otpCode: {
      type: String,
    },

    // Common fields
    walletBalance: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 5, // Bot uses 5 as default, web app uses 0
    },

    // Additional bot fields
    pickupAddress: {
      type: String,
    },
    destinationAddress: {
      type: String,
    },
    notifiedListingIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Create the model only if it doesn't exist or we're not in a server context
const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User as Model<IUser>;
