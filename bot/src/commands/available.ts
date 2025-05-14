import TelegramBot from 'node-telegram-bot-api';
import { ConversationState, updateUserState } from '../state.js';

export async function handleAvailable(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  
  if (!userId) return;
  
  // Update user state
  updateUserState(userId, {
    state: ConversationState.SETTING_AVAILABILITY,
    currentStep: 'availability_status',
    availabilityData: {
      isAvailable: false
    }
  });
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: "I'm Available", callback_data: 'available_yes' },
        { text: "I'm Not Available", callback_data: 'available_no' }
      ]
    ]
  };
  
  await bot.sendMessage(
    chatId,
    "Would you like to set yourself as available for deliveries?",
    {
      reply_markup: keyboard
    }
  );
}