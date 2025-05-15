import { db } from './index.js';
import type { Bid as BotBid } from '../types.js'; // Renaming to avoid conflict with potential HTML BidElement

export interface Bid {
  id?: number;
  listingId: string; // uuid of the listing
  userId: number; // telegramId of the user who placed the bid
  userName: string;
  amount: number;
  timestamp?: Date; // Will be set by DB default
  status: BotBid['status']; // 'pending' | 'accepted' | 'rejected'
}

export const BidService = {
  // Create a new bid
  async createBid(bidData: Omit<Bid, 'id' | 'timestamp'>): Promise<Bid> {
    try {
      const [id] = await db('bids').insert(bidData);
      const newBid = await this.getBidById(id);
      if (!newBid) throw new Error('Failed to retrieve newly created bid');
      return newBid;
    } catch (error) {
      console.error('Error in createBid:', error);
      throw error;
    }
  },

  // Get bid by its database ID
  async getBidById(id: number): Promise<Bid | null> {
    try {
      return await db('bids').where('id', id).first() || null;
    } catch (error) {
      console.error('Error in getBidById:', error);
      throw error;
    }
  },

  // Get all bids for a specific listing
  async getBidsByListingId(listingId: string): Promise<Bid[]> {
    try {
      return await db('bids').where('listingId', listingId).select('*');
    } catch (error) {
      console.error('Error in getBidsByListingId:', error);
      throw error;
    }
  },

  // Get all bids by a specific user
  async getBidsByUserId(userId: number): Promise<Bid[]> {
    try {
      return await db('bids').where('userId', userId).select('*');
    } catch (error) {
      console.error('Error in getBidsByUserId:', error);
      throw error;
    }
  },

  // Update a bid's status
  async updateBidStatus(bidId: number, status: Bid['status']): Promise<Bid | null> {
    try {
      await db('bids').where('id', bidId).update({ status, timestamp: new Date() }); // Also update timestamp on status change
      return await this.getBidById(bidId);
    } catch (error) {
      console.error('Error in updateBidStatus:', error);
      throw error;
    }
  },

  // Update multiple bids' status for a listing (e.g., reject others when one is accepted)
  async updateBidsStatusByListingId(listingId: string, newStatus: Bid['status'], excludeBidId?: number): Promise<number> {
    try {
      let query = db('bids').where('listingId', listingId);
      if (excludeBidId) {
        query = query.whereNot('id', excludeBidId);
      }
      return await query.update({ status: newStatus, timestamp: new Date() });
    } catch (error) {
      console.error('Error in updateBidsStatusByListingId:', error);
      throw error;
    }
  },

  // Delete a bid by its ID
  async deleteBid(bidId: number): Promise<boolean> {
    try {
      const deletedRows = await db('bids').where('id', bidId).del();
      return deletedRows > 0;
    } catch (error) {
      console.error('Error in deleteBid:', error);
      throw error;
    }
  }
};