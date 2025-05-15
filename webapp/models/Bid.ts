import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBid extends Document {
  bidId: string;
  travelerId: string;
  listingId: string;
  proposedFee: number;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BidSchema: Schema = new Schema(
  {
    bidId: {
      type: String,
      required: true,
      unique: true,
    },
    travelerId: {
      type: String,
      required: true,
      ref: 'User',
    },
    listingId: {
      type: String,
      required: true,
      ref: 'Listing',
    },
    proposedFee: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
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
const Bid = mongoose.models.Bid || mongoose.model<IBid>('Bid', BidSchema);

export default Bid as Model<IBid>;
