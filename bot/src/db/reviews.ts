import { db } from './index.js';

export interface Review {
  id?: number;
  fromUserId: number; // telegramId of the user who wrote the review
  toUserId: number;   // telegramId of the user being reviewed
  listingId: string;  // uuid of the listing the review is for
  rating: number;     // 1-5
  comment: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export const ReviewService = {
  // Create a new review
  async createReview(reviewData: Omit<Review, 'id' | 'created_at' | 'updated_at'>): Promise<Review> {
    try {
      const [id] = await db('reviews').insert(reviewData);
      const newReview = await this.getReviewById(id);
      if (!newReview) throw new Error('Failed to retrieve newly created review');
      return newReview;
    } catch (error) {
      console.error('Error in createReview:', error);
      throw error;
    }
  },

  // Get review by its database ID
  async getReviewById(id: number): Promise<Review | null> {
    try {
      return await db('reviews').where('id', id).first() || null;
    } catch (error) {
      console.error('Error in getReviewById:', error);
      throw error;
    }
  },

  // Get all reviews for a specific user (reviews they received)
  async getReviewsForUser(toUserId: number): Promise<Review[]> {
    try {
      return await db('reviews').where('toUserId', toUserId).select('*');
    } catch (error) {
      console.error('Error in getReviewsForUser:', error);
      throw error;
    }
  },

  // Get all reviews written by a specific user
  async getReviewsByUser(fromUserId: number): Promise<Review[]> {
    try {
      return await db('reviews').where('fromUserId', fromUserId).select('*');
    } catch (error) {
      console.error('Error in getReviewsByUser:', error);
      throw error;
    }
  },

  // Get reviews for a specific listing
  async getReviewsForListing(listingId: string): Promise<Review[]> {
    try {
      return await db('reviews').where('listingId', listingId).select('*');
    } catch (error) {
      console.error('Error in getReviewsForListing:', error);
      throw error;
    }
  },

  // Calculate average rating for a user
  async getAverageRatingForUser(toUserId: number): Promise<number> {
    try {
      const result = await db('reviews')
        .where('toUserId', toUserId)
        .avg('rating as averageRating')
        .first();
      return result && typeof result.averageRating === 'number' ? parseFloat(result.averageRating.toFixed(1)) : 0;
    } catch (error) {
      console.error('Error in getAverageRatingForUser:', error);
      throw error;
    }
  },

  // Update a review (e.g., if a user wants to edit their comment or rating)
  // Note: This might be restricted based on business logic (e.g., only within a certain time frame)
  async updateReview(reviewId: number, updates: Partial<Omit<Review, 'id' | 'fromUserId' | 'toUserId' | 'listingId' | 'created_at' | 'updated_at'>>): Promise<Review | null> {
    try {
      await db('reviews').where('id', reviewId).update({ ...updates, updated_at: new Date() });
      return await this.getReviewById(reviewId);
    } catch (error) {
      console.error('Error in updateReview:', error);
      throw error;
    }
  },

  // Delete a review by its ID (e.g., for moderation)
  async deleteReview(reviewId: number): Promise<boolean> {
    try {
      const deletedRows = await db('reviews').where('id', reviewId).del();
      return deletedRows > 0;
    } catch (error) {
      console.error('Error in deleteReview:', error);
      throw error;
    }
  }
};