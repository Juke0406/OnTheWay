import TelegramBot from 'node-telegram-bot-api';
import Listing, { ListingStatus } from '../models/Listing.js';
import User from '../models/User.js';

export async function handleStatus(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;
  
  if (!telegramId) return;
  
  try {
    // Find user in database
    const user = await User.findOne({ telegramId });
    
    if (!user) {
      await bot.sendMessage(chatId, "You need to start the bot first with /start");
      return;
    }
    
    // Get user's buyer listings
    const buyerListings = await Listing.find({ buyerId: telegramId });
    
    // Get user's traveler deliveries
    const travelerDeliveries = await Listing.find({ 
      travelerId: telegramId,
      status: { $in: [ListingStatus.MATCHED, ListingStatus.COMPLETED] }
    });
    
    let message = "*Your Active Listings:*\n";
    
    if (buyerListings.length === 0) {
      message += "You don't have any active listings.\n";
    } else {
      for (const listing of buyerListings) {
        message += `\n📦 #${listing._id}: ${listing.itemDescription}\n`;
        message += `Status: ${listing.status}\n`;
        message += `Price: $${listing.itemPrice}\n`;
        message += `Max Fee: $${listing.maxFee}\n`;
        
        if (listing.status === ListingStatus.MATCHED && listing.travelerId) {
          const traveler = await User.findOne({ telegramId: listing.travelerId });
          if (traveler) {
            message += `Traveler: ${traveler.firstName}\n`;
          }
        }
      }
    }
    
    message += "\n*Your Deliveries:*\n";
    
    if (travelerDeliveries.length === 0) {
      message += "You don't have any active deliveries.\n";
    } else {
      for (const delivery of travelerDeliveries) {
        message += `\n🚚 #${delivery._id}: ${delivery.itemDescription}\n`;
        message += `Status: ${delivery.status}\n`;
        message += `Price: $${delivery.itemPrice}\n`;
        
        const buyer = await User.findOne({ telegramId: delivery.buyerId });
        if (buyer) {
          message += `Buyer: ${buyer.firstName}\n`;
        }
        
        if (delivery.status === ListingStatus.MATCHED && delivery.otpTraveler) {
          message += `Your OTP: ${delivery.otpTraveler}\n`;
        }
      }
    }
    
    message += "\nUse /newrequest to create a new listing or /available to update your availability.";
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in handleStatus:', error);
    await bot.sendMessage(chatId, "Sorry, there was an error processing your request. Please try again later.");
  }
}
