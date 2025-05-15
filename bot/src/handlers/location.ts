import TelegramBot from 'node-telegram-bot-api';
import { ConversationState, getUserState, updateUserState } from '../state.js';
import { showNearbyListings } from '../commands/listings.js';
import axios from 'axios';

// Add Google Maps API key from environment variables
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Define an interface for the live location data
interface LiveLocationData {
  lastLocation: {
    latitude: number;
    longitude: number;
  };
  lastUpdateTime: number;
  chatId: number;
  messageId: number;
  address?: string; // Add address field
}

// Dictionary to store active live location sharing sessions
// Format: {userId: {lastLocation: {latitude, longitude}, lastUpdateTime: timestamp}}
const activeLiveLocations: Record<string, LiveLocationData> = {};

// Log interval in milliseconds (10 seconds)
const LOG_INTERVAL = 10000;

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
  
  console.log(`📍 [LOCATION] Received location from user ${userId}: ${location.latitude}, ${location.longitude}`);
  
  // Check if this is a live location update
  if (location.live_period) {
    console.log(`🔄 [LIVE] Received live location update from user ${userId} with live_period: ${location.live_period}`);
    await handleLiveLocation(bot, msg);
    return;
  }
  
  const userState = await getUserState(userId);
  
  switch (userState.state) {
    case ConversationState.CREATING_LISTING:
      await handleListingLocation(bot, msg, userState.currentStep);
      break;
    case ConversationState.SETTING_AVAILABILITY:
      // For availability, request live location instead
      await requestLiveLocation(bot, chatId);
      break;
    case ConversationState.VIEWING_LISTINGS:
      // For viewing listings, we can still use static location
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

// New function to handle live location updates
async function handleLiveLocation(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const location = msg.location;
  const messageId = msg.message_id;
  
  if (!userId || !location) return;
  
  const currentTime = Date.now();
  
  // Get address from coordinates
  const address = await getAddressFromCoordinates(location.latitude, location.longitude);
  
  // Log the updated location with address
  console.log(`📍 [LOCATION] User ${userId} updated live location: ${location.latitude}, ${location.longitude} - ${address}`);
  
  const userState = await getUserState(userId);
  
  // Check if this is a new location or significantly different from the last one
  const previousData = activeLiveLocations[userId.toString()];
  let isSignificantMove = true;
  
  if (previousData) {
    const prevLat = previousData.lastLocation.latitude;
    const prevLng = previousData.lastLocation.longitude;
    
    // Calculate distance between previous and current location
    const distance = calculateDistance(
      prevLat, prevLng, 
      location.latitude, location.longitude
    );
    
    // Only consider it a significant move if more than 100 meters
    isSignificantMove = distance > 0.1; // 0.1 km = 100 meters
    
    if (isSignificantMove) {
      console.log(`🚶 [MOVEMENT] User ${userId} moved ${(distance * 1000).toFixed(0)} meters from previous location`);
    }
  }
  
  // Store or update the user's live location
  activeLiveLocations[userId.toString()] = {
    lastLocation: {
      latitude: location.latitude,
      longitude: location.longitude
    },
    lastUpdateTime: currentTime,
    chatId: chatId,
    messageId: messageId,
    address: address // Store the address
  };
  
  // IMPORTANT: Preserve the existing radius when updating the user's location
  const existingRadius = userState.availabilityData?.radius;
  console.log(`ℹ️ [INFO] User ${userId} has radius: ${existingRadius || 'undefined'}`);
  
  // Update the user's location in the database regardless of state
  // IMPORTANT: Make sure to preserve the existing radius
  updateUserState(userId, {
    availabilityData: {
      isAvailable: true,
      location: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      isLiveLocation: true,
      radius: existingRadius // Preserve the existing radius
    }
  });
  
  // If this is the first live location update for availability setting
  if (userState.state === ConversationState.SETTING_AVAILABILITY && userState.currentStep === 'location') {
    console.log(`✅ [AVAILABILITY] User ${userId} became available with live location tracking`);
    
    updateUserState(userId, {
      currentStep: 'radius',
      state: ConversationState.SETTING_AVAILABILITY
    });
    
    await bot.sendMessage(
      chatId,
      `Great! I'm now tracking your live location at:\n${address}\n\nWhat radius around your current location are you willing to travel? (in kilometers)`,
      { 
        reply_markup: { 
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
  // If user is available and has moved significantly, check for nearby listings
  else if (userState.availabilityData?.isAvailable && 
           existingRadius) { // Use the stored radius variable
    
    // Get the user's radius preference
    const radius = existingRadius;
    
    // Check for nearby listings without sending a message first
    const newLocation = {
      latitude: location.latitude,
      longitude: location.longitude
    };
    
    // Only check for new listings every 5 minutes or when significant movement is detected
    const fiveMinutesInMs = 5 * 60 * 1000;
    const shouldCheckListings = isSignificantMove || 
                               !previousData || 
                               (currentTime - (previousData.lastUpdateTime || 0) > fiveMinutesInMs);
    
    if (shouldCheckListings) {
      console.log(`🔍 [SEARCH] Checking for nearby listings for user ${userId} with radius ${radius}km`);
      
      // Store the last time we checked for listings
      if (activeLiveLocations[userId.toString()]) {
        activeLiveLocations[userId.toString()].lastUpdateTime = currentTime;
      }
      
      // Use the existing function to find and notify about nearby listings
      await showNearbyListings(bot, chatId, userId, radius, newLocation, true);
    } else {
      console.log(`⏱️ [SKIP] Skipping nearby listing check for user ${userId} (not significant movement or too soon)`);
    }
  } else {
    console.log(`ℹ️ [INFO] User ${userId} is not available or has no radius set, not checking for listings`);
  }
}

// Function to request live location instead of static
async function requestLiveLocation(bot: TelegramBot, chatId: number): Promise<void> {
  await bot.sendMessage(
    chatId,
    "To be available for deliveries, please share your *live location* so we can match you with nearby requests in real-time.\n\n" +
    "1. Tap the 📎 attachment button\n" +
    "2. Select 'Location'\n" +
    "3. Choose 'Share Live Location'\n" +
    "4. Select a duration (at least 1 hour recommended)",
    {
      parse_mode: 'Markdown',
      reply_markup: {
        // Remove the keyboard button that requests static location
        remove_keyboard: true
      }
    }
  );
  
  // Send a follow-up message with an image showing how to share live location
  await bot.sendMessage(
    chatId,
    "Please use Telegram's built-in live location sharing feature as shown in the steps above. The 'Share Location' button can only share static location."
  );
}

// Setup a function to periodically check for stale live locations
export function setupLiveLocationTracking(bot: TelegramBot): void {
  setInterval(async () => {
    const currentTime = Date.now();
    
    for (const userIdStr in activeLiveLocations) {
      const userData = activeLiveLocations[userIdStr];
      const { lastLocation, lastUpdateTime, chatId } = userData;
      const userId = parseInt(userIdStr);
      
      // Check if location is stale (no updates for 2 minutes)
      const twoMinutesInMs = 2 * 60 * 1000;
      if (currentTime - lastUpdateTime > twoMinutesInMs) {
        console.log(`⚠️ [TIMEOUT] User ${userId} location tracking timed out after ${Math.floor((currentTime - lastUpdateTime) / 1000)} seconds`);
        
        // Get the current user state to preserve the radius
        const userState = await getUserState(userId);
        const existingRadius = userState.availabilityData?.radius;
        
        // Mark user as unavailable but preserve radius
        updateUserState(userId, {
          availabilityData: {
            isAvailable: false,
            location: lastLocation,
            isLiveLocation: false,
            radius: existingRadius // Preserve the radius
          }
        });
        
        // Notify the user
        await bot.sendMessage(
          chatId,
          "You've stopped sharing your live location, so you've been marked as unavailable for deliveries. Use /available anytime to become available again."
        );
        
        // Remove from active tracking
        delete activeLiveLocations[userIdStr];
      }
    }
  }, 60000); // Check every minute instead of every 10 seconds
  
  console.log(`🔄 [SYSTEM] Live location tracking system initialized`);
}

// Add a function to explicitly handle when a user stops sharing location
export async function handleStopLiveLocation(bot: TelegramBot, userId: number): Promise<void> {
  // Check if this user has an active live location
  if (activeLiveLocations[userId.toString()]) {
    const userData = activeLiveLocations[userId.toString()];
    
    console.log(`🛑 [STOP] User ${userId} manually stopped sharing live location`);
    
    // Get the current user state to preserve the radius
    const userState = await getUserState(userId);
    const existingRadius = userState.availabilityData?.radius;
    
    // Mark user as unavailable but preserve radius
    updateUserState(userId, {
      availabilityData: {
        isAvailable: false,
        location: userData.lastLocation,
        isLiveLocation: false,
        radius: existingRadius // Preserve the radius
      }
    });
    
    // Notify the user
    await bot.sendMessage(
      userData.chatId,
      "You've stopped sharing your live location, so you've been marked as unavailable for deliveries. Use /available anytime to become available again."
    );
    
    // Remove from active tracking
    delete activeLiveLocations[userId.toString()];
  }
}

// Add a command to manually stop sharing location
export async function handleStopSharing(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  
  if (!userId) return;
  
  await handleStopLiveLocation(bot, userId);
  
  // If the user wasn't sharing location, just acknowledge
  if (!activeLiveLocations[userId.toString()]) {
    await bot.sendMessage(
      chatId,
      "You're not currently sharing your live location."
    );
  }
}

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in km
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}
