import mongoose, { Schema, Document } from 'mongoose';
import { ConversationState } from '../state.js';

export interface ILocation {
    latitude: number;
    longitude: number;
}

export interface IAvailabilityData {
    isAvailable: boolean;
    radius?: number;
    location?: ILocation;
    isLiveLocation?: boolean;
}

export interface IListingData {
    itemDescription: string;
    itemPrice: number;
    maxFee: number;
    pickupLocation?: ILocation;
    destinationLocation?: ILocation;
}

export interface IUser extends Document {
    telegramId: number;
    username?: string;
    firstName: string;
    lastName?: string;
    state: ConversationState;
    currentStep?: string;
    listingData?: IListingData;
    availabilityData?: IAvailabilityData;
    currentListingId?: string;
    otpCode?: string;
    walletBalance: number;
    rating: number;
    pickupAddress?: string;
    destinationAddress?: string;
    notifiedListingIds?: string[];
    nlpFlow?: boolean;
    nlpData?: {
        intent: string;
        conversationHistory: string[];
        collectedFields: Record<string, any>;
        missingFields: string[];
    };
    email?: string;
    emailVerified: boolean;
    image?: string;
    password?: string;
    accounts?: any[];
    sessions?: any[];
    createdAt: Date;
    updatedAt: Date;
}

const CONVERSATION_STATES = [
    'idle',
    'creating_listing',
    'setting_availability',
    'bidding',
    'confirming_delivery',
    'rating',
    'viewing_listings'
];

const UserSchema: Schema = new Schema({
    telegramId: { type: Number, required: true, unique: true },
    username: { type: String },
    firstName: { type: String, default: "User" },
    lastName: { type: String },
    state: {
        type: String,
        enum: CONVERSATION_STATES,
        default: 'idle'
    },
    currentStep: { type: String },
    listingData: {
        itemDescription: { type: String },
        itemPrice: { type: Number },
        maxFee: { type: Number },
        pickupLocation: {
            latitude: { type: Number },
            longitude: { type: Number }
        },
        destinationLocation: {
            latitude: { type: Number },
            longitude: { type: Number }
        }
    },
    pickupAddress: { type: String },
    destinationAddress: { type: String },
    availabilityData: {
        isAvailable: { type: Boolean, default: false },
        radius: { type: Number },
        location: {
            latitude: { type: Number },
            longitude: { type: Number }
        }
    },
    currentListingId: { type: String },
    otpCode: { type: String },
    walletBalance: { type: Number, default: 0 },
    rating: { type: Number, default: 5 },
    notifiedListingIds: { type: [String], default: [] },
    nlpFlow: { type: Boolean, default: false },
    email: { type: String },
    emailVerified: { type: Boolean, default: false },
    image: { type: String },
    password: { type: String },
    accounts: { type: Array, default: [] },
    sessions: { type: Array, default: [] },
}, { timestamps: true });

// Override the default pluralized collection name
export default mongoose.model<IUser>('User', UserSchema, 'user');
