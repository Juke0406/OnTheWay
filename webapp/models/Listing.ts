import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IListing extends Document {
  listingId: string;
  buyerId: string;
  itemDescription: string;
  itemPrice: number;
  pickupLocation: {
    address: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  destinationLocation: {
    address: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  maxFee: number;
  status: 'open' | 'matched' | 'completed' | 'cancelled';
  acceptedBidId?: string;
  otpBuyer?: string;
  otpTraveler?: string;
  deliveryConfirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema: Schema = new Schema(
  {
    listingId: {
      type: String,
      required: true,
      unique: true,
    },
    buyerId: {
      type: String,
      required: true,
      ref: 'User',
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
    pickupLocation: {
      address: {
        type: String,
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        index: '2dsphere',
      },
    },
    destinationLocation: {
      address: {
        type: String,
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        index: '2dsphere',
      },
    },
    maxFee: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['open', 'matched', 'completed', 'cancelled'],
      default: 'open',
    },
    acceptedBidId: {
      type: String,
      ref: 'Bid',
    },
    otpBuyer: {
      type: String,
    },
    otpTraveler: {
      type: String,
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
const Listing = mongoose.models.Listing || mongoose.model<IListing>('Listing', ListingSchema);

export default Listing as Model<IListing>;
