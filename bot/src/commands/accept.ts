import TelegramBot from 'node-telegram-bot-api';
import { ConversationState, updateUserState } from '../state.js';
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

        if (!listing) {
            await bot.sendMessage(chatId, "Sorry, this listing doesn't exist or has been removed.");
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
Price: $${listing.itemPrice}
Maximum Fee: $${listing.maxFee}

How much would you like to charge for this delivery?
Please enter an amount in dollars.
    `;

        await bot.sendMessage(chatId, message);
    } catch (error) {
        await bot.sendMessage(chatId, "Sorry, there was an error processing your request. Please try again later.");
    }
}
