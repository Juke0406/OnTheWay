import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
    fromUserId: number;
    toUserId: number;
    listingId: mongoose.Types.ObjectId;
    rating: number;
    comment?: string;
    createdAt: Date;
}

const ReviewSchema: Schema = new Schema({
    fromUserId: { type: Number, required: true, ref: 'User' },
    toUserId: { type: Number, required: true, ref: 'User' },
    listingId: { type: Schema.Types.ObjectId, required: true, ref: 'Listing' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String }
}, { timestamps: true });

export default mongoose.model<IReview>('Review', ReviewSchema);