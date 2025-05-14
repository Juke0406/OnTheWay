import User from './models/User.js';
import type { IUser } from './models/User.js';

export enum ConversationState {
  IDLE = 'idle',
  CREATING_LISTING = 'creating_listing',
  SETTING_AVAILABILITY = 'setting_availability',
  BIDDING = 'bidding',
  CONFIRMING_DELIVERY = 'confirming_delivery',
  RATING = 'rating',
  VIEWING_LISTINGS = 'viewing_listings'
}

// Get user state from database
export async function getUserState(telegramId: number): Promise<IUser> {
  let user = await User.findOne({ telegramId });
  
  if (!user) {
    // User doesn't exist, create a new one
    user = new User({
      telegramId,
      state: 'idle' // Use string value directly to avoid circular reference
    });
    await user.save();
  }
  
  return user;
}

// Update user state in database
export async function updateUserState(
  telegramId: number, 
  update: Partial<IUser>
): Promise<IUser> {
  const user = await User.findOneAndUpdate(
    { telegramId },
    { $set: update },
    { new: true, upsert: true }
  );
  
  return user;
}

// Initialize or reset user state
export async function initUserState(
  telegramId: number,
  firstName: string,
  lastName?: string,
  username?: string
): Promise<IUser> {
  const user = await User.findOneAndUpdate(
    { telegramId },
    {
      $set: {
        telegramId,
        firstName,
        lastName,
        username,
        state: 'idle', // Use string value directly to avoid circular reference
        currentStep: undefined,
        listingData: undefined,
        currentListingId: undefined,
        otpCode: undefined
      }
    },
    { new: true, upsert: true }
  );
  
  return user;
}

