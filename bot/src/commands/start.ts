import TelegramBot from 'node-telegram-bot-api';
import { initUserState } from '../state.js';

export async function handleStart(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const firstName = msg.from?.first_name || '';
    const lastName = msg.from?.last_name;
    const username = msg.from?.username;

    if (!userId) return;

    await initUserState(userId, firstName, lastName, username);

    const welcomeMessage = `
Welcome to OnTheWay! 🚀

I'm here to help you connect with travelers who can bring items to you or help you earn by delivering items to others.

*Commands:*
/newrequest - Create a new delivery request
/available - Set your availability as a traveler
/listings - View delivery requests near you
/accept - Accept a delivery request
/status - Check your active listings and deliveries
/wallet - View your wallet balance
/topup - Add funds to your wallet
/cancel - Cancel current operation and return to main menu

Let's get started!
`;

    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
}
