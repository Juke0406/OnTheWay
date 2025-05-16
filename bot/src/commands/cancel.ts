import TelegramBot from 'node-telegram-bot-api';
import { ConversationState, updateUserState } from '../state.js';

export async function handleCancel(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    // Reset user state to idle
    updateUserState(userId, {
        state: ConversationState.IDLE,
        currentStep: undefined,
        listingData: undefined,
        pickupAddress: undefined,
        destinationAddress: undefined,
        nlpFlow: false
    });

    await bot.sendMessage(
        chatId,
        "I've cancelled your current operation. What would you like to do next?"
    );
}