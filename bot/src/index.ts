import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { connectDB } from './db.js';
import { handleStart } from './commands/start.js';
import { handleNewRequest } from './commands/newRequest.js';
import { handleAvailable } from './commands/available.js';
import { handleAccept, handleTopup } from './commands/accept.js';
import { handleStatus } from './commands/status.js';
import { handleLocation, setupLiveLocationTracking, handleStopSharing, handleStopLiveLocation, setupListingPolling } from './handlers/location.js';
import { handleCallbackQuery } from './handlers/callbackQuery.js';
import { handleText } from './handlers/text.js';
import { handleListings } from './commands/listings.js';
import { handleWallet } from './commands/wallet.js';
import { handleCancel } from './commands/cancel.js';

if (!process.env.TELEGRAM_BOT_TOKEN) {
    process.exit(1);
}

if (!process.env.MONGODB_URI) {
    process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not set. Natural language processing will not work.");
}

connectDB();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: true
});

bot.setWebHook('', {
    allowed_updates: ["message", "edited_message", "callback_query"]
});

setupLiveLocationTracking(bot);
setupListingPolling(bot);

bot.onText(/\/start/, (msg) => handleStart(bot, msg));
bot.onText(/\/newrequest/, (msg) => handleNewRequest(bot, msg));
bot.onText(/\/available/, (msg) => handleAvailable(bot, msg));
bot.onText(/\/accept (.+)/, (msg, match) => handleAccept(bot, msg, match));
bot.onText(/\/status/, (msg) => handleStatus(bot, msg));
bot.onText(/\/listings/, (msg) => handleListings(bot, msg));
bot.onText(/\/stopsharing/, (msg) => handleStopSharing(bot, msg));
bot.onText(/\/topup/, (msg) => handleTopup(bot, msg));
bot.onText(/\/wallet/, (msg) => handleWallet(bot, msg));
bot.onText(/\/cancel/, (msg) => handleCancel(bot, msg));

bot.on('location', (msg) => handleLocation(bot, msg));

bot.on('edited_message', (msg) => {
    if (msg.location) {
        const userId = msg.from?.id;
        if (!userId) return;

        if (msg.location.live_period === undefined) {
            handleStopLiveLocation(bot, userId);
        } else {
            handleLocation(bot, msg);
        }
    }
});

bot.on('text', (msg) => {
    if (msg.text?.startsWith('/')) return;
    handleText(bot, msg);
});

bot.on('callback_query', (query) => handleCallbackQuery(bot, query));

const app = new Hono();

app.get('/', (c) => {
    return c.text('OnTheWay Bot is running!');
});

serve({
    fetch: app.fetch,
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
}, (info) => {
});

bot.on('polling_error', (error) => {
});
