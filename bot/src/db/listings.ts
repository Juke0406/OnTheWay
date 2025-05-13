import { db } from './index.js';
import type { Request as BotRequest, Listing as BotListing, Bid as BotBid } from '../types.js'; // Renaming to avoid conflict

export interface Listing {
  id?: number;
  listingId: string; // uuid
  userId: number; // telegramId of the user who created the listing
  userName: string;
  requestType: string;
  pickupLocation: BotRequest['pickupLocation'] | null;
  dropoffLocation: BotRequest['dropoffLocation'] | null;
  requestDetails: BotRequest['requestDetails'];
  status: BotRequest['status'];
  created_at?: Date;
  updated_at?: Date;
  acceptedBy: BotRequest['acceptedBy'] | null;
  requesterOtp: string | null;
  courierOtp: string | null;
  minPrice: number | null;
  estimatedPrice: string | null;
}

export const ListingService = {
  // Create a new listing
  async createListing(listingData: Omit<Listing, 'id' | 'created_at' | 'updated_at'>): Promise<Listing> {
    try {
      const [id] = await db('listings').insert({
        ...listingData,
        pickupLocation: listingData.pickupLocation ? JSON.stringify(listingData.pickupLocation) : null,
        dropoffLocation: listingData.dropoffLocation ? JSON.stringify(listingData.dropoffLocation) : null,
        requestDetails: JSON.stringify(listingData.requestDetails),
        acceptedBy: listingData.acceptedBy ? JSON.stringify(listingData.acceptedBy) : null,
      });
      const newListing = await this.getListingByDbId(id);
      if (!newListing) throw new Error('Failed to retrieve newly created listing');
      return newListing;
    } catch (error) {
      console.error('Error in createListing:', error);
      throw error;
    }
  },

  // Get listing by its database ID
  async getListingByDbId(id: number): Promise<Listing | null> {
    try {
      const listing = await db('listings').where('id', id).first();
      if (!listing) return null;
      return {
        ...listing,
        pickupLocation: listing.pickupLocation ? JSON.parse(listing.pickupLocation) : null,
        dropoffLocation: listing.dropoffLocation ? JSON.parse(listing.dropoffLocation) : null,
        requestDetails: JSON.parse(listing.requestDetails),
        acceptedBy: listing.acceptedBy ? JSON.parse(listing.acceptedBy) : null,
      };
    } catch (error) {
      console.error('Error in getListingByDbId:', error);
      throw error;
    }
  },

  // Get listing by its unique listingId (uuid)
  async getListingByListingId(listingId: string): Promise<Listing | null> {
    try {
      const listing = await db('listings').where('listingId', listingId).first();
      if (!listing) return null;
      return {
        ...listing,
        pickupLocation: listing.pickupLocation ? JSON.parse(listing.pickupLocation) : null,
        dropoffLocation: listing.dropoffLocation ? JSON.parse(listing.dropoffLocation) : null,
        requestDetails: JSON.parse(listing.requestDetails),
        acceptedBy: listing.acceptedBy ? JSON.parse(listing.acceptedBy) : null,
      };
    } catch (error) {
      console.error('Error in getListingByListingId:', error);
      throw error;
    }
  },

  // Get all listings by a user (telegramId)
  async getListingsByUserId(userId: number): Promise<Listing[]> {
    try {
      const listings = await db('listings').where('userId', userId).select('*');
      return listings.map(listing => ({
        ...listing,
        pickupLocation: listing.pickupLocation ? JSON.parse(listing.pickupLocation) : null,
        dropoffLocation: listing.dropoffLocation ? JSON.parse(listing.dropoffLocation) : null,
        requestDetails: JSON.parse(listing.requestDetails),
        acceptedBy: listing.acceptedBy ? JSON.parse(listing.acceptedBy) : null,
      }));
    } catch (error) {
      console.error('Error in getListingsByUserId:', error);
      throw error;
    }
  },

  // Get available listings (status = 'pending' or 'available')
  async getAvailableListings(): Promise<Listing[]> {
    try {
      const listings = await db('listings')
        .whereIn('status', ['pending', 'available']) // 'available' from old types, 'pending' from new db schema
        .select('*');
      return listings.map(listing => ({
        ...listing,
        pickupLocation: listing.pickupLocation ? JSON.parse(listing.pickupLocation) : null,
        dropoffLocation: listing.dropoffLocation ? JSON.parse(listing.dropoffLocation) : null,
        requestDetails: JSON.parse(listing.requestDetails),
        acceptedBy: listing.acceptedBy ? JSON.parse(listing.acceptedBy) : null,
      }));
    } catch (error) {
      console.error('Error in getAvailableListings:', error);
      throw error;
    }
  },

  // Update a listing
  async updateListing(listingId: string, updates: Partial<Omit<Listing, 'id' | 'listingId' | 'userId' | 'created_at' | 'updated_at'>>): Promise<Listing | null> {
    try {
      const updateData: Record<string, any> = { ...updates, updated_at: new Date() };

      if (updates.pickupLocation) updateData.pickupLocation = JSON.stringify(updates.pickupLocation);
      if (updates.dropoffLocation) updateData.dropoffLocation = JSON.stringify(updates.dropoffLocation);
      if (updates.requestDetails) updateData.requestDetails = JSON.stringify(updates.requestDetails);
      if (updates.acceptedBy) updateData.acceptedBy = JSON.stringify(updates.acceptedBy);
      
      await db('listings').where('listingId', listingId).update(updateData);
      return await this.getListingByListingId(listingId);
    } catch (error) {
      console.error('Error in updateListing:', error);
      throw error;
    }
  },

  // Delete a listing by listingId
  async deleteListing(listingId: string): Promise<boolean> {
    try {
      const deletedRows = await db('listings').where('listingId', listingId).del();
      return deletedRows > 0;
    } catch (error) {
      console.error('Error in deleteListing:', error);
      throw error;
    }
  }
};