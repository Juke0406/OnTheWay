import { Document, Types } from "mongoose";
import { ConversationState } from "./User";

// Define listing status enum to match the bot
export enum ListingStatus {
  OPEN = "open",
  MATCHED = "matched",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

// Define bid status enum to match the bot
export enum BidStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
}

// Location interface
export interface ILocation {
  latitude: number;
  longitude: number;
}

// Availability data interface
export interface IAvailabilityData {
  isAvailable: boolean;
  radius?: number;
  location?: ILocation;
  isLiveLocation?: boolean;
}

// Listing data interface
export interface IListingData {
  itemDescription: string;
  itemPrice: number;
  maxFee: number;
  pickupLocation?: ILocation;
  destinationLocation?: ILocation;
}

// User interface
export interface IUser extends Document {
  // Web app specific fields
  userId: string;
  email?: string;
  image?: string;

  // Fields from bot model
  telegramId?: number;
  username?: string;
  name: string; // Web app uses name, bot uses firstName/lastName
  firstName?: string;
  lastName?: string;

  // Bot state management fields
  state?: ConversationState;
  currentStep?: string;
  listingData?: IListingData;
  availabilityData?: IAvailabilityData;
  currentListingId?: string;
  otpCode?: string;

  // Common fields
  walletBalance: number;
  rating: number;

  // Additional bot fields
  pickupAddress?: string;
  destinationAddress?: string;
  notifiedListingIds?: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Listing interface
export interface IListing extends Document {
  // Web app specific fields
  listingId: string;

  // Fields from bot model
  buyerId: string | number; // Support both string (web) and number (bot)
  itemDescription: string;
  itemPrice: number;
  maxFee: number;

  // Location fields - using bot format
  pickupLocation?: ILocation & {
    address?: string; // Keep address for display purposes
  };
  destinationLocation?: ILocation & {
    address?: string; // Keep address for display purposes
  };

  // Common fields
  status: ListingStatus;
  acceptedBidId?: string | Types.ObjectId;
  travelerId?: string | number; // Support both string (web) and number (bot)
  otpBuyer?: string;
  otpTraveler?: string;

  // Additional bot fields
  buyerConfirmed?: boolean;
  travelerConfirmed?: boolean;
  deliveryConfirmed: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Bid interface
export interface IBid extends Document {
  // Web app specific fields
  bidId?: string;

  // Fields from bot model
  travelerId: string | number; // Support both string (web) and number (bot)
  listingId: string | Types.ObjectId; // Support both string (web) and ObjectId (bot)
  proposedFee: number;
  status: BidStatus;

  // Web app specific fields
  timestamp?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Bot specific field
  _id: Types.ObjectId;
}

// Review interface
export interface IReview extends Document {
  // Web app specific fields
  reviewId?: string;

  // Fields from bot model
  fromUserId: string | number; // Support both string (web) and number (bot)
  toUserId: string | number; // Support both string (web) and number (bot)
  listingId: string | Types.ObjectId; // Support both string (web) and ObjectId (bot)
  rating: number;
  comment?: string;

  // Timestamps
  createdAt: Date;
  updatedAt?: Date; // Bot model doesn't have updatedAt
}
