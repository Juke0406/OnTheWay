import TelegramBot from 'node-telegram-bot-api';
import { ConversationState, updateUserState } from '../state.js';

export async function handleAvailable(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    updateUserState(userId, {
        state: ConversationState.SETTING_AVAILABILITY,
        currentStep: 'availability'
    });

    await bot.sendMessage(
        chatId,
        "Would you like to be available for deliveries?",
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Yes", callback_data: "available_yes" },
                        { text: "❌ No", callback_data: "available_no" }
                    ]
                ]
            }
        }
    );
}
