import TelegramBot from 'node-telegram-bot-api';
import { ConversationState, updateUserState, getUserState } from '../state.js';
import Listing from '../models/Listing.js';

export async function handleAccept(
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null
): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId || !match) return;

    const listingId = match[1];

    try {
        const listing = await Listing.findById(listingId);
        const user = await getUserState(userId);

        if (!listing) {
            await bot.sendMessage(chatId, "Sorry, this listing doesn't exist or has been removed.");
            return;
        }

        // Calculate total cost (item price + delivery fee)
        const totalCost = listing.itemPrice + listing.maxFee;

        // Check traveler's wallet balance
        if (user.walletBalance < listing.itemPrice) {
            await bot.sendMessage(
                chatId, 
                `You need at least $${listing.itemPrice} in your wallet to purchase this item. Your current balance is $${user.walletBalance}. Please use /topup to add funds.`
            );
            return;
        }

        updateUserState(userId, {
            state: ConversationState.BIDDING,
            currentStep: 'propose_fee',
            currentListingId: listingId
        });

        const message = `
You're accepting delivery request #${listingId}:

Item: ${listing.itemDescription}
Item Price: $${listing.itemPrice}
Maximum Delivery Fee: $${listing.maxFee}
Total Cost: $${totalCost}

How much would you like to charge for this delivery?
Please enter an amount in dollars.
    `;

        await bot.sendMessage(chatId, message);
    } catch (error) {
        await bot.sendMessage(chatId, "Sorry, there was an error processing your request. Please try again later.");
    }
}

// Add topup command handler
export async function handleTopup(
    bot: TelegramBot,
    msg: TelegramBot.Message
): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    try {
        // Always prompt for amount
        updateUserState(userId, {
            state: ConversationState.TOPUP,
            currentStep: 'topup_amount'
        });
        
        await bot.sendMessage(
            chatId, 
            "How much would you like to add to your wallet? (in dollars)",
            { reply_markup: { force_reply: true } }
        );
    } catch (error) {
        console.error("Error in topup command:", error);
        await bot.sendMessage(chatId, "Sorry, there was an error processing your request. Please try again later.");
    }
}
