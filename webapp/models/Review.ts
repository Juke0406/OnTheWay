import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
  reviewId: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  comment?: string;
  listingId: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema(
  {
    reviewId: {
      type: String,
      required: true,
      unique: true,
    },
    fromUserId: {
      type: String,
      required: true,
      ref: 'User',
    },
    toUserId: {
      type: String,
      required: true,
      ref: 'User',
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
      type: String,
      required: true,
      ref: 'Listing',
    },
  },
  {
    timestamps: true,
  }
);

// Create the model only if it doesn't exist or we're not in a server context
const Review = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

export default Review as Model<IReview>;
