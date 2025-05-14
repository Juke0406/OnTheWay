import TelegramBot from 'node-telegram-bot-api';
import { ConversationState, getUserState, updateUserState } from '../state.js';
import Listing, { ListingStatus } from '../models/Listing.js';
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

// Helper function to calculate distance between two points using Haversine formula
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

export async function handleListings(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  
  if (!userId) return;
  
  try {
    // Get user state to check if they're available and have a location
    const userState = await getUserState(userId);
    const isAvailable = userState.availabilityData?.isAvailable || false;
    const userLocation = userState.availabilityData?.location;
    const userRadius = userState.availabilityData?.radius || 5; // Default 5km radius if not set
    
    if (isAvailable && userLocation) {
      // User is available and has a location, show nearby listings
      await showNearbyListings(bot, chatId, userId, userRadius, userLocation);
    } else {
      // User is not available or doesn't have a location, ask for location
      updateUserState(userId, {
        state: ConversationState.VIEWING_LISTINGS,
        currentStep: 'share_location'
      });
      
      const FIXED_RADIUS = 5; // 5km radius for non-available users
      
      await bot.sendMessage(
        chatId,
        `To see delivery requests near you, please share your current location. We'll show requests within ${FIXED_RADIUS}km of your location:`,
        {
          reply_markup: {
            keyboard: [[{ text: "📍 Share Location", request_location: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        }
      );
    }
  } catch (error) {
    console.error('Error in handleListings:', error);
    await bot.sendMessage(
      chatId,
      "Sorry, there was an error processing your request. Please try again later."
    );
  }
}

// Function to show nearby listings based on location
export async function showNearbyListings(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  radius: number,
  userLocation: { latitude: number, longitude: number }
): Promise<void> {
  try {
    if (!userLocation) {
      await bot.sendMessage(chatId, "We couldn't determine your location. Please try again.");
      return;
    }
    
    // Find listings within the user's radius
    const nearbyListings = await Listing.find({
      status: ListingStatus.OPEN
    }).limit(50); // Get more listings initially, then filter
    
    // Filter and sort listings by distance to pickup location
    const listingsWithDistance = nearbyListings
      .filter(listing => listing.pickupLocation) // Only include listings with pickup locations
      .map(listing => {
        // Calculate distance to pickup location
        const pickupDistance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          listing.pickupLocation!.latitude,
          listing.pickupLocation!.longitude
        );
        
        return { listing, distance: pickupDistance };
      })
      .filter(item => item.distance <= radius) // Only include listings within radius
      .sort((a, b) => a.distance - b.distance); // Sort by distance
    
    if (listingsWithDistance.length === 0) {
      await bot.sendMessage(
        chatId, 
        "There are no delivery requests in your area right now. Try again later or increase your radius with /available."
      );
      return;
    }
    
    // Show all nearby listings
    await bot.sendMessage(
      chatId,
      `Found ${listingsWithDistance.length} delivery requests near your location:`
    );
    
    // Limit to 10 listings to avoid flooding
    const limitedListings = listingsWithDistance.slice(0, 10);
    
    for (const { listing, distance } of limitedListings) {
      // Get human-readable addresses for pickup and destination
      const pickupAddress = await getAddressFromCoordinates(
        listing.pickupLocation!.latitude,
        listing.pickupLocation!.longitude
      );
      
      let destinationAddress = 'Unknown destination';
      if (listing.destinationLocation) {
        destinationAddress = await getAddressFromCoordinates(
          listing.destinationLocation.latitude,
          listing.destinationLocation.longitude
        );
      }
      
      // Create map URLs
      const pickupMapUrl = `https://www.google.com/maps?q=${listing.pickupLocation!.latitude},${listing.pickupLocation!.longitude}`;
      
      let destinationMapUrl = '';
      if (listing.destinationLocation) {
        destinationMapUrl = `https://www.google.com/maps?q=${listing.destinationLocation.latitude},${listing.destinationLocation.longitude}`;
      }
      
      const listingMessage = `
📦 *Delivery Request #${listing._id}*

Item: ${listing.itemDescription}
Price: $${listing.itemPrice}
Offered Fee: $${listing.maxFee}
Distance: ${distance.toFixed(1)} km away

*Pickup:* ${pickupAddress}
*Delivery:* ${destinationAddress}
      `;
      
      // Create inline keyboard with map buttons and accept option
      const inlineKeyboard: TelegramBot.InlineKeyboardButton[][] = [
        [
          { text: "✅ Accept Delivery", callback_data: `bid_accept_${listing._id}` }
        ],
        [
          { text: "🗺️ View Pickup Map", url: pickupMapUrl }
        ]
      ];
      
      // Add destination map button if available
      if (destinationMapUrl) {
        inlineKeyboard.push([
          { text: "🗺️ View Delivery Map", url: destinationMapUrl }
        ]);
      }
      
      await bot.sendMessage(chatId, listingMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      });
      
      // Add a small delay between messages to avoid flooding
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (listingsWithDistance.length > 10) {
      await bot.sendMessage(
        chatId,
        `Showing 10 of ${listingsWithDistance.length} available requests. Use /available to update your preferences.`
      );
    }
  } catch (error) {
    console.error('Error finding nearby listings:', error);
    await bot.sendMessage(
      chatId,
      "There was an error finding delivery requests in your area. Please try again later."
    );
  }
}
