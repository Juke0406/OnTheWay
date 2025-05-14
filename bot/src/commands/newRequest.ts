import TelegramBot from 'node-telegram-bot-api';
import { ConversationState, updateUserState } from '../state.js';

export async function handleNewRequest(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  
  if (!userId) return;
  
  // Update user state to creating listing
  updateUserState(userId, {
    state: ConversationState.CREATING_LISTING,
    currentStep: 'item_description',
    listingData: {
      itemDescription: '',
      itemPrice: 0,
      maxFee: 0
    }
  });
  
  await bot.sendMessage(
    chatId,
    "Let's create a new delivery request! 📦\n\nWhat item would you like someone to buy and deliver to you?",
    {
      reply_markup: {
        force_reply: true,
      }
    }
  );
}
