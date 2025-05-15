# OnTheWay Telegram Bot

A Telegram bot for facilitating deliveries and requests. Users can create delivery requests, accept delivery jobs, track status, and communicate with each other through the bot.

## Features

- 🤖 Bot setup with Telegram Bot API
- 📋 Handle /start, /newrequest, /available, /accept, /status commands
- 💬 Message parsing with Google's Gemini AI integration
- 📝 Multi-turn conversation for form filling
- 📍 Live location sharing
- 🔔 Notifications for matched listings
- 💲 Bidding UI with inline buttons
- 🔑 OTP exchange & submission
- ⭐ Confirmation and review prompts

## Setup Instructions

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Start a chat with BotFather and send `/newbot`
3. Follow the prompts to choose a name and username for your bot
4. BotFather will provide a token for your bot - **save this token**

### 2. Get Gemini API Key

1. Visit the [Google AI Studio](https://aistudio.google.com/)
2. Create an account if you don't have one
3. Generate an API key for the Gemini model
4. Copy the API key

### 3. Configure Environment Variables

1. Copy the `.env.example` file to create a `.env` file:

   ```bash
   cp .env.example .env
   ```

2. Open the `.env` file and add your Telegram Bot Token and Gemini API Key:

   ```bash
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   GEMINI_API_KEY=your_gemini_api_key
   ```

### 4. Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install

# Or using yarn
yarn install
```

## Running the Bot

For development:

```bash
pnpm dev
```

For production:

```bash
pnpm build
pnpm start
```

## Available Commands

- `/start` - Introduction to the bot and display available commands
- `/newrequest` - Create a new delivery request
- `/available` - See available delivery requests nearby
- `/accept [request_id]` - Accept a specific delivery request
- `/status` - Check the status of your ongoing requests

## Development

The project structure:

```bash
bot/
├── src/
│   ├── index.ts       # Main entry point
│   ├── types.ts       # TypeScript interfaces and types
│   ├── handlers.ts    # Command handlers and message processing
│   └── gemini.ts      # Gemini AI integration
├── .env.example       # Example environment variables
├── package.json       # Project dependencies
└── tsconfig.json      # TypeScript configuration
```

## License

MIT
