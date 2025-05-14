import TelegramBot from 'node-telegram-bot-api';
import { ConversationState, getUserState, updateUserState } from '../state.js';
import { showNearbyListings } from '../commands/listings.js';
import axios from 'axios';

// Add Google Maps API key from environment variables
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Helper function for reverse geocoding
async function getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
    );
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      return response.data.results[0].formatted_address;
    }
    return 'Unknown location';
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return 'Unknown location';
  }
}

export async function handleLocation(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const location = msg.location;
  
  if (!userId || !location) return;
  
  const userState = await getUserState(userId);
  
  switch (userState.state) {
    case ConversationState.CREATING_LISTING:
      await handleListingLocation(bot, msg, userState.currentStep);
      break;
    case ConversationState.SETTING_AVAILABILITY:
      await handleAvailabilityLocation(bot, msg);
      break;
    case ConversationState.VIEWING_LISTINGS:
      await handleViewListingsLocation(bot, msg);
      break;
    default:
      await bot.sendMessage(
        chatId,
        "Thanks for sharing your location, but I'm not sure what to do with it right now. Try using a command like /newrequest, /available, or /listings first."
      );
  }
}

async function handleListingLocation(bot: TelegramBot, msg: TelegramBot.Message, currentStep?: string): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const location = msg.location;
  
  if (!userId || !location) return;
  
  switch (currentStep) {
    case 'pickup_location':
      // Get address from coordinates
      const pickupAddress = await getAddressFromCoordinates(location.latitude, location.longitude);
      
      // Save pickup location and address
      const currentUserState = await getUserState(userId);
      const currentListingData = currentUserState.listingData || {
        itemDescription: '',
        itemPrice: 0,
        maxFee: 0
      };
      
      updateUserState(userId, {
        listingData: {
          ...currentListingData,
          pickupLocation: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        },
        pickupAddress: pickupAddress, // Store the address
        currentStep: 'destination_location'
      });
      
      await bot.sendMessage(
        chatId,
        `Great! Pickup location set to: ${pickupAddress}\n\nNow, where should the item be delivered to? Please share a location or type an address.`,
        {
          reply_markup: {
            keyboard: [[{ text: "📍 Share Location", request_location: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        }
      );
      break;
      
    case 'destination_location':
      // Get address from coordinates
      const destinationAddress = await getAddressFromCoordinates(location.latitude, location.longitude);
      
      // Save destination location and address
      const currentUserStateForDest = await getUserState(userId);
      const currentListingDataForDest = currentUserStateForDest.listingData || {
        itemDescription: '',
        itemPrice: 0,
        maxFee: 0
      };
      
      updateUserState(userId, {
        listingData: {
          ...currentListingDataForDest,
          destinationLocation: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        },
        destinationAddress: destinationAddress, // Store the address
        currentStep: 'max_fee'
      });
      
      await bot.sendMessage(
        chatId,
        `Delivery location set to: ${destinationAddress}\n\nWhat's the maximum fee you're willing to pay for delivery? (in dollars)`,
        { 
          reply_markup: { 
            remove_keyboard: true,
            force_reply: true 
          } 
        }
      );
      break;
      
    default:
      await bot.sendMessage(
        chatId,
        "Something went wrong. Please try again with /newrequest."
      );
  }
}

async function handleAvailabilityLocation(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const location = msg.location;
  
  if (!userId || !location) return;
  
  // Save traveler's location
  updateUserState(userId, {
    availabilityData: {
      isAvailable: true, // Make sure isAvailable is set to true
      location: {
        latitude: location.latitude,
        longitude: location.longitude
      }
    },
    currentStep: 'radius',
    state: ConversationState.SETTING_AVAILABILITY
  });
  
  await bot.sendMessage(
    chatId,
    "What radius around your location are you willing to travel? (in kilometers)",
    { 
      reply_markup: { 
        remove_keyboard: true,
        force_reply: true,
        inline_keyboard: [
          [
            { text: "1 km", callback_data: "radius_1" },
            { text: "3 km", callback_data: "radius_3" },
            { text: "5 km", callback_data: "radius_5" },
            { text: "10 km", callback_data: "radius_10" }
          ]
        ]
      } 
    }
  );
}

async function handleViewListingsLocation(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const location = msg.location;
  
  if (!userId || !location) return;
  
  // Set state back to IDLE
  updateUserState(userId, {
    state: ConversationState.IDLE,
    currentStep: undefined
  });
  
  // Show nearby listings with the temporary location
  // Hardcode radius to 5km for non-available users
  const FIXED_RADIUS = 5; // 5km radius for non-available users
  
  await showNearbyListings(
    bot, 
    chatId, 
    userId, 
    FIXED_RADIUS, // Use fixed 5km radius
    { latitude: location.latitude, longitude: location.longitude }
  );
}
