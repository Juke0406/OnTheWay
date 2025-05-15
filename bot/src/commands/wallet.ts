
import TelegramBot from 'node-telegram-bot-api';
import User from '../models/User.js';

export async function handleWallet(
    bot: TelegramBot,
    msg: TelegramBot.Message
): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    try {
        const user = await User.findOne({ telegramId: userId });
        
        if (!user) {
            await bot.sendMessage(chatId, "You don't have an account yet. Please use /start to create one.");
            return;
        }
        
        await bot.sendMessage(
            chatId,
            `💰 *Your Wallet*\n\nCurrent Balance: $${user.walletBalance.toFixed(2)}\n\nUse /topup to add funds to your wallet.`,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        await bot.sendMessage(chatId, "Sorry, there was an error retrieving your wallet information.");
    }
}

