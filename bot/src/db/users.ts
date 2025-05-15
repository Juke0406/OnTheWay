import { db } from './index.js';

export interface User {
  id?: number;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  rating: number;
  walletBalance: number;
  created_at?: Date;
  updated_at?: Date;
}

export const UserService = {
  // Create or update a user
  async createOrUpdateUser(userData: Partial<User>): Promise<User> {
    if (!userData.telegramId) {
      throw new Error('telegramId is required');
    }

    try {
      // Check if user exists
      const existingUser = await db('users').where('telegramId', userData.telegramId).first();

      if (existingUser) {
        // Update existing user
        await db('users')
          .where('telegramId', userData.telegramId)
          .update({
            ...userData,
            updated_at: new Date()
          });
        
        return await this.getUserByTelegramId(userData.telegramId);
      } else {
        // Create new user
        const [id] = await db('users').insert({
          ...userData,
          rating: userData.rating || 0,
          walletBalance: userData.walletBalance || 0
        });
        
        return await this.getUserById(id);
      }
    } catch (error) {
      console.error('Error in createOrUpdateUser:', error);
      throw error;
    }
  },

  // Get user by ID
  async getUserById(id: number): Promise<User | null> {
    try {
      return await db('users').where('id', id).first() || null;
    } catch (error) {
      console.error('Error in getUserById:', error);
      throw error;
    }
  },

  // Get user by Telegram ID
  async getUserByTelegramId(telegramId: number): Promise<User | null> {
    try {
      return await db('users').where('telegramId', telegramId).first() || null;
    } catch (error) {
      console.error('Error in getUserByTelegramId:', error);
      throw error;
    }
  },

  // Update user's wallet balance
  async updateWalletBalance(telegramId: number, amount: number): Promise<User | null> {
    try {
      await db('users')
        .where('telegramId', telegramId)
        .increment('walletBalance', amount);
      
      return await this.getUserByTelegramId(telegramId);
    } catch (error) {
      console.error('Error in updateWalletBalance:', error);
      throw error;
    }
  },

  // Update user's rating
  async updateUserRating(telegramId: number, newRating: number): Promise<User | null> {
    try {
      await db('users')
        .where('telegramId', telegramId)
        .update('rating', newRating);
      
      return await this.getUserByTelegramId(telegramId);
    } catch (error) {
      console.error('Error in updateUserRating:', error);
      throw error;
    }
  },

  // List all users
  async listUsers(): Promise<User[]> {
    try {
      return await db('users').select('*');
    } catch (error) {
      console.error('Error in listUsers:', error);
      throw error;
    }
  }
};