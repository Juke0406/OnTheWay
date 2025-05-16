# OnTheWay Telegram Bot

A Telegram bot for facilitating peer-to-peer deliveries and requests. Users can create delivery requests, accept delivery jobs, track status, and communicate with each other through the bot.

## 🌟 Features

- 🤖 Telegram Bot API integration
- 📋 Command handling for delivery requests and management
- 💬 Natural language processing with Google's Gemini AI
- 📝 Multi-turn conversation for form filling
- 📍 Live location sharing and tracking
- 🔔 Real-time notifications for matched listings
- 💲 Bidding system with inline buttons
- 🔑 OTP exchange & verification for secure handoffs
- ⭐ Rating and review system
- 💰 Mock wallet system for simulating payments

## 📋 Prerequisites

- Node.js 18.x or higher
- MongoDB database
- Telegram Bot Token (from BotFather)
- Google Gemini API Key (optional, for NLP features)
- Google Maps API Key (for location services)

## 🚀 Setup Instructions

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Start a chat with BotFather and send `/newbot`
3. Follow the prompts to choose a name and username for your bot
4. BotFather will provide a token for your bot - **save this token**

### 2. Get Gemini API Key (Optional)

1. Visit the [Google AI Studio](https://aistudio.google.com/)
2. Create an account if you don't have one
3. Generate an API key for the Gemini model
4. Copy the API key

### 3. Configure Environment Variables

1. Copy the `.env.example` file to create a `.env` file:

   ```bash
   cp .env.example .env
   ```

2. Open the `.env` file and add your configuration:

   ```bash
   TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
   PORT="3000"
   MONGODB_URI="your_mongodb_uri"
   GOOGLE_MAPS_API_KEY="your_google_maps_api_key"
   GEMINI_API_KEY="your_gemini_api_key"
   ```

### 4. Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install
```

## 🏃‍♂️ Running the Bot

For development:

```bash
pnpm dev
```

For production:

```bash
pnpm build
pnpm start
```

## 🤖 Available Commands

- `/start` - Introduction to the bot and display available commands
- `/newrequest` - Create a new delivery request
- `/available` - See available delivery requests nearby
- `/accept [request_id]` - Accept a specific delivery request
- `/status` - Check the status of your ongoing requests
- `/listings` - View your current listings
- `/stopsharing` - Stop sharing your location
- `/topup` - Add funds to your wallet (mock)
- `/wallet` - Check your wallet balance
- `/cancel` - Cancel the current operation

## 🧠 Natural Language Processing

The bot uses Google's Gemini AI to understand natural language requests. Users can simply describe what they need, and the bot will extract the relevant information:

Example: "I need someone to pick up a coffee from Starbucks on Main Street and deliver it to my office at 123 Business Ave. I'm willing to pay $5 for delivery."

The bot will extract:

- Item description: Coffee from Starbucks
- Pickup location: Starbucks on Main Street
- Destination: 123 Business Ave
- Fee: $5

## 📱 Location Sharing

The bot supports Telegram's live location sharing feature. When a user shares their location, the bot tracks it and uses it to match them with nearby delivery requests.

## 💻 Development

### Project Structure

```
bot/
├── src/
│   ├── commands/           # Command handlers
│   │   ├── start.ts        # /start command
│   │   ├── newRequest.ts   # /newrequest command
│   │   └── ...
│   ├── handlers/           # Message and event handlers
│   │   ├── location.ts     # Location handling
│   │   ├── text.ts         # Text message handling
│   │   └── ...
│   ├── models/             # MongoDB models
│   │   ├── User.ts         # User model
│   │   ├── Listing.ts      # Listing model
│   │   └── ...
│   ├── db.ts               # Database connection
│   ├── gemini.ts           # Gemini AI integration
│   ├── index.ts            # Main entry point
│   ├── state.ts            # Conversation state management
│   └── types.ts            # TypeScript types
├── .env.example            # Example environment variables
├── package.json            # Project dependencies
└── tsconfig.json           # TypeScript configuration
```

### Database Models

The bot uses MongoDB with Mongoose for data storage. The main models are:

- **User**: Stores user information, conversation state, and wallet balance
- **Listing**: Stores delivery request details, status, and OTP codes
- **Bid**: Stores bid information for listings

### Integration with Web App

The bot shares the same MongoDB database with the web app, allowing for seamless integration between the two platforms. Users can create requests via the bot and manage them on the web app, or vice versa.

## 📄 License

MIT
