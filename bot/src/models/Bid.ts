import mongoose, { Schema, Document } from 'mongoose';

export enum BidStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined'
}

export interface IBid extends Document {
  travelerId: number;
  listingId: mongoose.Types.ObjectId;
  proposedFee: number;
  status: BidStatus;
  createdAt: Date;
  updatedAt: Date;
  _id: mongoose.Types.ObjectId;
}

const BidSchema: Schema = new Schema({
  travelerId: { type: Number, required: true, ref: 'User' },
  listingId: { type: Schema.Types.ObjectId, required: true, ref: 'Listing' },
  proposedFee: { type: Number, required: true },
  status: { 
    type: String, 
    enum: Object.values(BidStatus), 
    default: BidStatus.PENDING 
  }
}, { timestamps: true });

export default mongoose.model<IBid>('Bid', BidSchema);
