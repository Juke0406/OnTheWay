
import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { connectDB } from './db.js';
import { handleStart } from './commands/start.js';
import { handleNewRequest } from './commands/newRequest.js';
import { handleAvailable } from './commands/available.js';
import { handleAccept } from './commands/accept.js';
import { handleStatus } from './commands/status.js';
import { handleLocation } from './handlers/location.js';
import { handleText } from './handlers/text.js';
import { handleCallbackQuery } from './handlers/callbackQuery.js';
import { handleListings } from './commands/listings.js';

// Check for required environment variables
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

// Connect to MongoDB
connectDB().catch(console.error);

// Create a bot instance
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Command handlers
bot.onText(/\/start/, (msg) => handleStart(bot, msg));
bot.onText(/\/newrequest/, (msg) => handleNewRequest(bot, msg));
bot.onText(/\/available/, (msg) => handleAvailable(bot, msg));
bot.onText(/\/accept (.+)/, (msg, match) => handleAccept(bot, msg, match));
bot.onText(/\/status/, (msg) => handleStatus(bot, msg));
bot.onText(/\/listings/, (msg) => handleListings(bot, msg));

// Handle location sharing
bot.on('location', (msg) => handleLocation(bot, msg));

// Handle text messages (for multi-turn conversations)
bot.on('text', (msg) => {
  // Skip command messages
  if (msg.text?.startsWith('/')) return;
  handleText(bot, msg);
});

// Handle callback queries (for inline buttons)
bot.on('callback_query', (query) => handleCallbackQuery(bot, query));

// Create a simple health check API
const app = new Hono();

app.get('/', (c) => {
  return c.text('OnTheWay Bot is running!');
});

// Start the server
serve({
  fetch: app.fetch,
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
  console.log('Bot is running...');
});

// Handle errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

