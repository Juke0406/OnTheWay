import { Context } from 'telegraf';
import type { NarrowedContext, Telegraf } from 'telegraf';
import type { Update, Message, Location } from 'telegraf/types';

// Define the session structure for the bot
export interface BotSession {
  conversationState: 'idle' | 'filling_form' | 'confirming' | 'reviewing' | 'bidding' | 'verifying';
  formData: Record<string, any>;
  currentRequest: Request | null;
  availableListings: Listing[];
  acceptedRequests: Request[];
  currentBidding?: {
    listingId: string;
    minPrice: number;
  };
  verificationContext?: {
    listingId: string; // Changed from requestId to listingId
    isRequester: boolean;
  };
}

// Extend Context to include our custom session
export interface BotContext extends Context {
    session: BotSession;
}

// Define a bid structure
export interface Bid {
    userId: number;
    userName: string;
    amount: number;
    timestamp: Date;
    status: 'pending' | 'accepted' | 'rejected';
}

// Define a request structure
export interface Request {
    id: string;
    userId: number;
    userName: string;
    requestType: string;
    pickupLocation?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    dropoffLocation?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    requestDetails: Record<string, any>;
    status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'canceled';
    createdAt: Date;
    acceptedBy?: {
        userId: number;
        userName: string;
    };
    requesterOtp?: string;
    courierOtp?: string;
    minPrice?: number;
    estimatedPrice?: string;
    bids?: Bid[];
    acceptedBid?: Bid;
}

// Define a listing structure
export interface Listing {
    id: string;
    userId: number;
    userName: string;
    listingType: string;
    details: Record<string, any>;
    location?: {
        latitude: number;
        longitude: number;
    };
    status: 'available' | 'matched' | 'completed';
    createdAt: Date;
    bids?: Bid[];
}