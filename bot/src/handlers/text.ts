import TelegramBot from 'node-telegram-bot-api';
import { ConversationState, getUserState, updateUserState } from '../state.js';
import Listing, { ListingStatus } from '../models/Listing.js';
import Bid, { BidStatus } from '../models/Bid.js';
import User from '../models/User.js';

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

export async function handleText(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text;
  
  if (!userId || !text) return;
  
  const userState = await getUserState(userId);
  
  // Handle based on conversation state
  switch (userState.state) {
    case ConversationState.CREATING_LISTING:
      await handleListingCreation(bot, msg, userState.currentStep);
      break;
    case ConversationState.BIDDING:
      await handleBidding(bot, msg);
      break;
    case ConversationState.CONFIRMING_DELIVERY:
      await handleDeliveryConfirmation(bot, msg);
      break;
    default:
      // If no active conversation, just acknowledge
      await bot.sendMessage(chatId, "I'm not sure what you mean. Try using one of the commands like /newrequest or /available.");
  }
}

async function handleListingCreation(bot: TelegramBot, msg: TelegramBot.Message, currentStep?: string): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text;
  
  if (!userId || !text) return;
  
  switch (currentStep) {
    case 'item_description':
      // Save item description
      const userStateForDesc = await getUserState(userId);
      updateUserState(userId, {
        listingData: {
          ...(userStateForDesc.listingData || { itemPrice: 0, maxFee: 0 }),
          itemDescription: text
        },
        currentStep: 'item_price'
      });
      
      await bot.sendMessage(
        chatId,
        "Great! How much does this item cost? (in dollars)",
        { reply_markup: { force_reply: true } }
      );
      break;
      
    case 'item_price':
      const price = parseFloat(text);
      
      if (isNaN(price) || price <= 0) {
        await bot.sendMessage(
          chatId,
          "Please enter a valid price in dollars (e.g., 25.99).",
          { reply_markup: { force_reply: true } }
        );
        return;
      }
      
      // Save item price
      const userStateForPrice = await getUserState(userId);
      updateUserState(userId, {
        listingData: {
          ...(userStateForPrice.listingData || { itemDescription: '', maxFee: 0 }),
          itemPrice: price
        },
        currentStep: 'pickup_location'
      });
      
      await bot.sendMessage(
        chatId,
        "Where should the traveler pick up this item? Please share a location or type an address.",
        {
          reply_markup: {
            keyboard: [[{ text: "📍 Share Location", request_location: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        }
      );
      break;
      
    case 'pickup_location':
      // User typed an address instead of sharing location
      // Update state to handle text-based pickup location
      updateUserState(userId, {
        currentStep: 'pickup_location_text',
        pickupAddress: text
      });
      
      await bot.sendMessage(
        chatId,
        `Pickup address set to: ${text}\n\nWhere should the item be delivered to? Please share a location or type an address.`,
        {
          reply_markup: {
            keyboard: [[{ text: "📍 Share Location", request_location: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        }
      );
      break;
      
    case 'pickup_location_text':
      // Save pickup location as text
      const userStateForPickup = await getUserState(userId);
      // Create a custom location object
      const pickupLocationWithAddress = {
        latitude: 0, // Placeholder
        longitude: 0, // Placeholder
      };
      
      updateUserState(userId, {
        listingData: {
          ...(userStateForPickup.listingData || { itemDescription: '', itemPrice: 0, maxFee: 0 }),
          pickupLocation: pickupLocationWithAddress
        },
        // Store address separately
        pickupAddress: text,
        currentStep: 'destination_location'
      });
      
      await bot.sendMessage(
        chatId,
        "Where should the item be delivered to? Please share a location or type an address.",
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
      // User typed an address instead of sharing location
      // Update state to handle text-based destination location
      updateUserState(userId, {
        currentStep: 'destination_location_text',
        destinationAddress: text
      });
      
      await bot.sendMessage(
        chatId,
        `Delivery address set to: ${text}\n\nWhat's the maximum fee you're willing to pay for delivery? (in dollars)`,
        { 
          reply_markup: { 
            remove_keyboard: true,
            force_reply: true 
          } 
        }
      );
      break;
      
    case 'destination_location_text':
      // Save destination location as text
      const userStateForDest = await getUserState(userId);
      // Create a custom location object
      const destinationLocationWithAddress = {
        latitude: 0, // Placeholder
        longitude: 0, // Placeholder
      };
      
      updateUserState(userId, {
        listingData: {
          ...(userStateForDest.listingData || { itemDescription: '', itemPrice: 0, maxFee: 0 }),
          destinationLocation: destinationLocationWithAddress
        },
        // Store address separately
        destinationAddress: text,
        currentStep: 'max_fee'
      });
      
      await bot.sendMessage(
        chatId,
        "What's the maximum fee you're willing to pay for delivery? (in dollars)",
        { 
          reply_markup: { 
            remove_keyboard: true,
            force_reply: true 
          } 
        }
      );
      break;
      
    case 'max_fee':
      const fee = parseFloat(text);
      
      if (isNaN(fee) || fee <= 0) {
        await bot.sendMessage(
          chatId,
          "Please enter a valid fee in dollars (e.g., 5.00).",
          { reply_markup: { force_reply: true } }
        );
        return;
      }
      
      // Save max fee and complete listing
      const userStateForFee = await getUserState(userId);
      
      // Ensure we have a complete listing data object with all required properties
      const listingData = {
        itemDescription: userStateForFee.listingData?.itemDescription || '',
        itemPrice: userStateForFee.listingData?.itemPrice || 0,
        maxFee: fee,
        pickupLocation: userStateForFee.listingData?.pickupLocation,
        destinationLocation: userStateForFee.listingData?.destinationLocation
      };
      
      updateUserState(userId, {
        listingData,
        state: ConversationState.IDLE,
        currentStep: undefined
      });
      
      // Save the listing to the database
      const newListing = new Listing({
        buyerId: userId,
        itemDescription: listingData.itemDescription,
        itemPrice: listingData.itemPrice,
        maxFee: listingData.maxFee,
        pickupLocation: listingData.pickupLocation,
        destinationLocation: listingData.destinationLocation,
        status: ListingStatus.OPEN
      });
      
      await newListing.save();
      
      // Notify nearby travelers about the new listing
      await notifyNearbyTravelers(bot, newListing);
      
      const summary = `
Your listing has been created! 🎉

*Listing #${newListing._id}*
Item: ${listingData.itemDescription}
Price: $${listingData.itemPrice}
Pickup: ${userStateForFee.pickupAddress || 'Location shared'}
Delivery: ${userStateForFee.destinationAddress || 'Location shared'}
Max Fee: $${listingData.maxFee}

We'll notify you when travelers place bids on your listing.
Check /status anytime to see updates.
      `;
      
      await bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });
      break;
      
    default:
      await bot.sendMessage(chatId, "Something went wrong. Please try again with /newrequest.");
  }
}

async function handleBidding(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text;
  
  if (!userId || !text) return;
  
  const userState = await getUserState(userId);
  const fee = parseFloat(text);
  
  if (isNaN(fee) || fee <= 0) {
    await bot.sendMessage(
      chatId,
      "Please enter a valid fee in dollars (e.g., 5.00).",
      { reply_markup: { force_reply: true } }
    );
    return;
  }
  
  try {
    // Get the listing
    const listing = await Listing.findById(userState.currentListingId);
    
    if (!listing) {
      await bot.sendMessage(chatId, "This listing is no longer available.");
      updateUserState(userId, {
        state: ConversationState.IDLE,
        currentStep: undefined,
        currentListingId: undefined
      });
      return;
    }
    
    // Check if the proposed fee is at least the minimum fee
    if (fee < listing.maxFee) {
      await bot.sendMessage(
        chatId,
        `Your proposed fee must be at least $${listing.maxFee}. Please enter a higher amount.`,
        { reply_markup: { force_reply: true } }
      );
      return;
    }
    
    // Create a new bid
    const newBid = new Bid({
      travelerId: userId,
      listingId: listing._id,
      proposedFee: fee,
      status: BidStatus.PENDING
    });
    
    await newBid.save();
    
    // Reset user state
    updateUserState(userId, {
      state: ConversationState.IDLE,
      currentStep: undefined,
      currentListingId: undefined
    });
    
    // Notify the buyer about the bid
    const buyerNotification = `
🔔 *New Bid Received!*

A traveler has proposed a fee for your delivery request:
Item: ${listing.itemDescription}
Price: $${listing.itemPrice}
Proposed Fee: $${fee} (your max: $${listing.maxFee})

This bid will expire in 20 seconds. Accept now?
    `;
    
    const buyerKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ Accept Bid", callback_data: `bid_buyer_accept_${newBid._id}` },
          { text: "❌ Decline", callback_data: `bid_buyer_decline_${newBid._id}` }
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
    
    // Confirm to the traveler
    await bot.sendMessage(
      chatId,
      `
Your bid of $${fee} has been submitted for listing #${listing._id}! 🎉

The buyer has been notified of your offer. Waiting for their response...
      `,
      { parse_mode: 'Markdown' }
    );
    
    // Set a timeout to expire the bid after 20 seconds
    setTimeout(async () => {
      try {
        // Check if the bid is still pending
        const currentBid = await Bid.findById(newBid._id);
        
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
  } catch (error) {
    console.error('Error in handleBidding:', error);
    await bot.sendMessage(
      chatId,
      "There was an error processing your bid. Please try again later."
    );
  }
}

async function handleDeliveryConfirmation(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text;
  
  if (!userId || !text) return;
  
  const userState = await getUserState(userId);
  
  // Check if the entered OTP matches
  if (text === userState.otpCode) {
    updateUserState(userId, {
      state: ConversationState.IDLE,
      currentStep: undefined,
      otpCode: undefined
    });
    
    await bot.sendMessage(
      chatId,
      "✅ OTP verified! The delivery has been confirmed as completed.\n\nPlease rate your experience with this transaction:",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⭐", callback_data: "rate_1" },
              { text: "⭐⭐", callback_data: "rate_2" },
              { text: "⭐⭐⭐", callback_data: "rate_3" },
              { text: "⭐⭐⭐⭐", callback_data: "rate_4" },
              { text: "⭐⭐⭐⭐⭐", callback_data: "rate_5" }
            ]
          ]
        }
      }
    );
  } else {
    await bot.sendMessage(
      chatId,
      "❌ The OTP code is incorrect. Please try again or contact support if you're having issues."
    );
  }
}

async function notifyNearbyTravelers(bot: TelegramBot, listing: any): Promise<void> {
  try {
    // Only notify if the listing has a pickup location
    if (!listing.pickupLocation) {
      return;
    }
    
    // Find all available travelers
    const availableTravelers = await User.find({
      'availabilityData.isAvailable': true,
      'availabilityData.location': { $exists: true },
      'availabilityData.radius': { $exists: true }
    });
    
    for (const traveler of availableTravelers) {
      const userLocation = traveler.availabilityData?.location;
      const userRadius = traveler.availabilityData?.radius || 0;
      
      if (!userLocation) continue;
      
      // Calculate distance to pickup location
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        listing.pickupLocation.latitude,
        listing.pickupLocation.longitude
      );
      
      // If the pickup location is within the traveler's radius, notify them
      if (distance <= userRadius) {
        const notificationMessage = `
🔔 *New Delivery Opportunity!*

Someone needs an item ${distance.toFixed(1)} km from your location:
Item: ${listing.itemDescription}
Price: $${listing.itemPrice}
Offered Fee: $${listing.maxFee}

Are you interested in picking up this item?
        `;
        
        await bot.sendMessage(traveler.telegramId, notificationMessage, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Accept", callback_data: `bid_accept_${listing._id}` },
                { text: "❌ Decline", callback_data: `bid_decline_${listing._id}` }
              ],
              [
                  { text: "💰 Offer Bid", callback_data: `bid_counter_${listing._id}` }
              ]
            ]
          }
        });
      }
    }
  } catch (error) {
    console.error('Error notifying travelers:', error);
  }
}
