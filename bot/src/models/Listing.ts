import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILocation {
  latitude: number;
  longitude: number;
}

export enum ListingStatus {
  OPEN = 'open',
  MATCHED = 'matched',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface IListing extends Document {
  _id: Types.ObjectId;
  buyerId: number;
  itemDescription: string;
  itemPrice: number;
  maxFee: number;
  pickupLocation?: ILocation;
  destinationLocation?: ILocation;
  status: ListingStatus;
  acceptedBidId?: Types.ObjectId;
  travelerId?: number;
  otpBuyer?: string;
  otpTraveler?: string;
  deliveryConfirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema: Schema = new Schema({
  buyerId: { type: Number, required: true, ref: 'User' },
  itemDescription: { type: String, required: true },
  itemPrice: { type: Number, required: true },
  maxFee: { type: Number, required: true },
  pickupLocation: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  destinationLocation: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  status: { 
    type: String, 
    enum: Object.values(ListingStatus), 
    default: ListingStatus.OPEN 
  },
  acceptedBidId: { type: Schema.Types.ObjectId, ref: 'Bid' },
  travelerId: { type: Number, ref: 'User' },
  otpBuyer: { type: String },
  otpTraveler: { type: String },
  deliveryConfirmed: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<IListing>('Listing', ListingSchema);
