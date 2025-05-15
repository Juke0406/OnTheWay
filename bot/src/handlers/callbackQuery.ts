import TelegramBot from 'node-telegram-bot-api';
import mongoose from 'mongoose';
import { ConversationState, getUserState, updateUserState } from '../state.js';
import Listing, { ListingStatus } from '../models/Listing.js';
import Bid, { BidStatus } from '../models/Bid.js';
import axios from 'axios';
import type { IUser } from '../models/User.js';

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

export async function handleCallbackQuery(bot: TelegramBot, query: TelegramBot.CallbackQuery): Promise<void> {
  const chatId = query.message?.chat.id;
  const userId = query.from.id;
  const data = query.data;
  
  if (!chatId || !data) return;
  
  // Acknowledge the callback query
  await bot.answerCallbackQuery(query.id);
  
  if (data.startsWith('available_')) {
    await handleAvailabilityResponse(bot, chatId, userId, data);
  } else if (data.startsWith('radius_')) {
    await handleRadiusSelection(bot, chatId, userId, data);
  } else if (data.startsWith('bid_')) {
    await handleBidResponse(bot, chatId, userId, data, query); // Pass the query parameter
  } else if (data.startsWith('rate_')) {
    await handleRatingSubmission(bot, chatId, userId, data);
  }
}

async function handleAvailabilityResponse(
  bot: TelegramBot, 
  chatId: number, 
  userId: number, 
  data: string
): Promise<void> {
  const isAvailable = data === 'available_yes';
  
  // Get current user state
  const currentState = getUserState(userId);
  
  // Update availability status
  updateUserState(userId, {
    availabilityData: {
      isAvailable, // This is always a boolean
      // Preserve existing data if available
      radius: (await currentState).availabilityData?.radius,
      location: (await currentState).availabilityData?.location
    },
    state: isAvailable ? ConversationState.SETTING_AVAILABILITY : ConversationState.IDLE,
    currentStep: isAvailable ? 'location' : undefined
  } as Partial<IUser>);
  
  if (!isAvailable) {
    await bot.sendMessage(
      chatId,
      "You've been marked as unavailable for deliveries. Use /available anytime to change your status."
    );
    return;
  }
  
  // User is available, ask for live location with clearer instructions
  await bot.sendMessage(
    chatId,
    "Great! To be available for deliveries, please share your *live location* so we can match you with nearby requests in real-time.\n\n" +
    "📍 *How to share live location:*\n" +
    "1. Tap the 📎 attachment button (bottom left)\n" +
    "2. Select 'Location'\n" +
    "3. Choose 'Share Live Location'\n" +
    "4. Select a duration (at least 1 hour recommended)",
    {
      parse_mode: 'Markdown',
      reply_markup: {
        remove_keyboard: true
      }
    }
  );
}

async function handleRadiusSelection(
  bot: TelegramBot, 
  chatId: number, 
  userId: number, 
  data: string
): Promise<void> {
  const radius = parseInt(data.split('_')[1]);
  
  console.log(`⭕ [RADIUS] User ${userId} set availability radius to ${radius}km`);
  
  // Get current user state
  const currentState = getUserState(userId);
  
  // Save radius and complete availability setting
  updateUserState(userId, {
    availabilityData: {
      isAvailable: true, // Ensure isAvailable is always set to true
      radius,
      location: (await currentState).availabilityData?.location
    },
    state: ConversationState.IDLE,
    currentStep: undefined
  });
  
  const confirmationMessage = `
You're now available as a traveler! 🎉

We'll notify you of delivery requests within ${radius} km of your location.
Use /status anytime to see available requests or /available to update your status.
  `;
  
  await bot.sendMessage(chatId, confirmationMessage, { 
    parse_mode: 'Markdown',
    reply_markup: { remove_keyboard: true }
  });
  
  // Find and show nearby listings
  console.log(`🔍 [INITIAL SEARCH] Checking for nearby listings for new traveler ${userId} with radius ${radius}km`);
  await showNearbyListings(bot, chatId, userId, radius);
}

// New function to find and show nearby listings
async function showNearbyListings(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  radius: number
): Promise<void> {
  try {
    const userState = await getUserState(userId);
    const userLocation = userState.availabilityData?.location;
    
    if (!userLocation) {
      await bot.sendMessage(chatId, "We couldn't determine your location. Please try setting your availability again.");
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
      .sort((a, b) => a.distance - b.distance) // Sort by distance
      .slice(0, 3); // Get top 3 closest listings
    
    if (listingsWithDistance.length === 0) {
      await bot.sendMessage(
        chatId, 
        "There are no delivery requests in your area right now. We'll notify you when new requests come in."
      );
      return;
    }
    
    // Show up to 3 nearest listings
    await bot.sendMessage(
      chatId,
      "Here are delivery requests near your location:"
    );
    
    for (const { listing, distance } of listingsWithDistance) {
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
      
      const notificationMessage = `
🔔 *Delivery Opportunity!*

Someone needs an item ${distance.toFixed(1)} km from your location:
Item: ${listing.itemDescription}
Price: $${listing.itemPrice}
Offered Fee: $${listing.maxFee}

*Pickup Location:* ${pickupAddress}
*Delivery Location:* ${destinationAddress}

Are you interested in picking up this item?
      `;
      
      // Create inline keyboard with map buttons
      const inlineKeyboard: TelegramBot.InlineKeyboardButton[][] = [
        [
          { text: "✅ Accept", callback_data: `bid_accept_${listing._id}` },
          { text: "❌ Decline", callback_data: `bid_decline_${listing._id}` }
        ],
        [
          { text: "💰 Offer Bid", callback_data: `bid_counter_${listing._id}` }
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
      
      await bot.sendMessage(chatId, notificationMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      });
      
      // Add a small delay between messages to avoid flooding
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Error finding nearby listings:', error);
    await bot.sendMessage(
      chatId,
      "There was an error finding delivery requests in your area. Please try again later."
    );
  }
}

async function handleBidResponse(
  bot: TelegramBot, 
  chatId: number, 
  userId: number, 
  data: string,
  query: TelegramBot.CallbackQuery
): Promise<void> {
  try {    
    // Handle different bid-related actions based on the callback data
    if (data.startsWith('bid_accept_')) {
      // Extract the listing ID (everything after 'bid_accept_')
      const listingId = data.substring('bid_accept_'.length);
      
      // Find the listing
      const listing = await Listing.findById(listingId);
      
      if (!listing) {
        await bot.sendMessage(chatId, "This listing is no longer available.");
        return;
      }
      
      // Get addresses for pickup and destination
      let pickupAddress = 'Unknown location';
      let destinationAddress = 'Unknown location';
      
      if (listing.pickupLocation) {
        pickupAddress = await getAddressFromCoordinates(
          listing.pickupLocation.latitude,
          listing.pickupLocation.longitude
        );
      }
      
      if (listing.destinationLocation) {
        destinationAddress = await getAddressFromCoordinates(
          listing.destinationLocation.latitude,
          listing.destinationLocation.longitude
        );
      }
      
      // Create a new bid
      const acceptBid = new Bid({
        travelerId: userId,
        listingId: listingId,
        proposedFee: listing.maxFee,
        status: BidStatus.PENDING
      });
      
      await acceptBid.save();
      
      // Notify the buyer about the bid
      const buyerNotification = `
🔔 *New Bid Received!*

A traveler has accepted your delivery request for:
Item: ${listing.itemDescription}
Price: $${listing.itemPrice}
Proposed Fee: $${listing.maxFee}

This bid will expire in 20 seconds. Accept now?
      `;
      
      const buyerKeyboard = {
        inline_keyboard: [
          [
            { text: "✅ Accept Bid", callback_data: `bid_buyer_accept_${acceptBid._id}` },
            { text: "❌ Decline", callback_data: `bid_buyer_decline_${acceptBid._id}` }
          ]
        ]
      };
      
      const buyerMessage = await bot.sendMessage(
        listing.buyerId, 
        buyerNotification, 
        { 
          parse_mode: 'Markdown',
          reply_markup: buyerKeyboard
        }
      );
      
      // Generate OTP for delivery confirmation
      const buyerOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const travelerOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      updateUserState(userId, {
        currentListingId: listingId,
        otpCode: travelerOtp
      });
      
      await bot.sendMessage(
        chatId,
        `
You've placed a bid for this delivery request! 🎉

*Delivery Details:*
Item: ${listing.itemDescription}
Price: $${listing.itemPrice}
Your Fee: $${listing.maxFee}

*Pickup Location:* ${pickupAddress}
*Delivery Location:* ${destinationAddress}

We've notified the buyer. Waiting for their response...
        `,
        { parse_mode: 'Markdown' }
      );
      
      // Set a timeout to expire the bid after 20 seconds
      setTimeout(async () => {
        try {
          // Check if the bid is still pending
          const currentBid = await Bid.findById(acceptBid._id);
          
          if (currentBid && currentBid.status === BidStatus.PENDING) {
            // Update bid status to expired
            currentBid.status = BidStatus.DECLINED;
            await currentBid.save();
            
            // Delete the buyer notification message
            await bot.deleteMessage(listing.buyerId, buyerMessage.message_id);
            
            // Notify the traveler that the bid expired
            await bot.sendMessage(
              userId,
              "Your bid has expired. The buyer didn't respond in time. Feel free to try again or look for other delivery requests."
            );
            
            // Notify the buyer that they missed a bid
            await bot.sendMessage(
              listing.buyerId,
              `You missed a bid for your listing "${listing.itemDescription}". The traveler's offer has expired.`
            );
          }
        } catch (error) {
          console.error('Error handling bid expiration:', error);
        }
      }, 20000); // 20 seconds
      
    } else if (data.startsWith('bid_decline_')) {
      // Extract the listing ID (everything after 'bid_decline_')
      const listingId = data.substring('bid_decline_'.length);
      
      // Delete the message with the delivery request
      if (query.message) {
        try {
          await bot.deleteMessage(chatId, query.message.message_id);
          console.log(`🗑️ [DELETE] Deleted declined delivery request message for user ${userId}, listing ${listingId}`);
        } catch (error) {
          console.error('Error deleting message:', error);
          // If we can't delete the message, send a new message instead
          await bot.sendMessage(
            chatId,
            "You've declined this delivery request. We'll notify you of other opportunities."
          );
        }
      } else {
        // Fallback if message is not available
        await bot.sendMessage(
          chatId,
          "You've declined this delivery request. We'll notify you of other opportunities."
        );
      }
      
    } else if (data.startsWith('bid_counter_')) {
      // Extract the listing ID (everything after 'bid_counter_')
      const listingId = data.substring('bid_counter_'.length);
      
      updateUserState(userId, {
        state: ConversationState.BIDDING,
        currentStep: 'propose_fee',
        currentListingId: listingId
      });
      
      const listing = await Listing.findById(listingId);
      
      if (!listing) {
        await bot.sendMessage(chatId, "This listing is no longer available.");
        return;
      }
      
      await bot.sendMessage(
        chatId,
        `What fee would you like to propose for this delivery? (minimum $${listing.maxFee})`,
        { reply_markup: { force_reply: true } }
      );
      
    } else if (data.startsWith('bid_buyer_accept_')) {
      // Extract the bid ID (everything after 'bid_buyer_accept_')
      const bidId = data.substring('bid_buyer_accept_'.length);
      
      const bid = await Bid.findById(bidId);
      
      if (!bid) {
        await bot.sendMessage(chatId, "This bid is no longer available.");
        return;
      }
      
      // Update bid status
      bid.status = BidStatus.ACCEPTED;
      await bid.save();
      
      // Update listing status
      const listingToUpdate = await Listing.findById(bid.listingId);
      if (listingToUpdate) {
        listingToUpdate.status = ListingStatus.MATCHED;
        listingToUpdate.acceptedBidId = bid._id;
        listingToUpdate.travelerId = bid.travelerId;
        
        // Generate OTPs
        const buyerOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const travelerOtp = Math.floor(100000 + Math.random() * 900000).toString();
        
        listingToUpdate.otpBuyer = buyerOtp;
        listingToUpdate.otpTraveler = travelerOtp;
        
        await listingToUpdate.save();
        
        // Reject all other pending bids for this listing
        const otherPendingBids = await Bid.find({
          listingId: bid.listingId,
          _id: { $ne: bid._id }, // Exclude the accepted bid
          status: BidStatus.PENDING
        });
        
        // Update all other pending bids to declined
        if (otherPendingBids.length > 0) {
          // Update all other bids to declined status
          await Bid.updateMany(
            {
              listingId: bid.listingId,
              _id: { $ne: bid._id },
              status: BidStatus.PENDING
            },
            { status: BidStatus.DECLINED }
          );
          
          // Notify other travelers that their bids were declined
          for (const otherBid of otherPendingBids) {
            await bot.sendMessage(
              otherBid.travelerId,
              `Your bid for the delivery request "${listingToUpdate.itemDescription}" has been declined because the buyer accepted another traveler's bid.`
            );
          }
        }
        
        // Notify the buyer
        await bot.sendMessage(
          chatId,
          `
You've accepted the traveler's bid! 🎉

*Delivery Details:*
Item: ${listingToUpdate.itemDescription}
Price: $${listingToUpdate.itemPrice}
Fee: $${bid.proposedFee}

The traveler will purchase and deliver your item. When they arrive, share this OTP code with them:

*Your OTP code is: ${buyerOtp}*

They will also have an OTP to share with you. Enter their OTP in the chat to confirm delivery.
          `,
          { parse_mode: 'Markdown' }
        );
        
        // Notify the traveler
        await bot.sendMessage(
          bid.travelerId,
          `
Great news! The buyer has accepted your bid! 🎉

*Delivery Details:*
Item: ${listingToUpdate.itemDescription}
Price: $${listingToUpdate.itemPrice}
Your Fee: $${bid.proposedFee}

Please purchase the item and meet the buyer at the delivery location.

*Your OTP code is: ${travelerOtp}*
Share this with the buyer when you meet. They will also have an OTP to share with you.

When you've completed the delivery, enter their OTP code to confirm.
          `,
          { parse_mode: 'Markdown' }
        );
        
        // Update traveler state
        updateUserState(bid.travelerId, {
          currentListingId: bid.listingId.toString(),
          otpCode: travelerOtp,
          state: ConversationState.CONFIRMING_DELIVERY
        });
        
        // Update buyer state
        updateUserState(listingToUpdate.buyerId, {
          currentListingId: bid.listingId.toString(),
          otpCode: buyerOtp,
          state: ConversationState.CONFIRMING_DELIVERY
        });
      }
      
    } else if (data.startsWith('bid_buyer_decline_')) {
      // Extract the bid ID (everything after 'bid_buyer_decline_')
      const bidId = data.substring('bid_buyer_decline_'.length);
      
      const declinedBid = await Bid.findById(bidId);
      
      if (!declinedBid) {
        await bot.sendMessage(chatId, "This bid is no longer available.");
        return;
      }
      
      // Update bid status
      declinedBid.status = BidStatus.DECLINED;
      await declinedBid.save();
      
      // Notify the buyer
      await bot.sendMessage(
        chatId,
        "You've declined this bid. The traveler has been notified."
      );
      
      // Notify the traveler
      await bot.sendMessage(
        declinedBid.travelerId,
        "The buyer has declined your bid. Feel free to look for other delivery requests."
      );
    }
  } catch (error) {
    console.error('Error handling bid response:', error);
    await bot.sendMessage(
      chatId,
      "There was an error processing your request. Please try again later."
    );
  }
}

async function handleRatingSubmission(
  bot: TelegramBot, 
  chatId: number, 
  userId: number, 
  data: string
): Promise<void> {
  const rating = parseInt(data.split('_')[1]);
  
  // In a real app, you would save this rating to the database
  
  await bot.sendMessage(
    chatId,
    `
Thank you for your ${rating}-star rating! 🌟

Your feedback helps improve our community. The transaction is now complete.

Use /status to check your active listings and deliveries, or /available to update your availability status.
    `,
    { parse_mode: 'Markdown' }
  );
}
