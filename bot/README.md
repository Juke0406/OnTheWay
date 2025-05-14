# OnTheWay Telegram Bot

A Telegram bot for peer-to-peer delivery and shopping assistance. OnTheWay connects buyers who need items from places they can't visit with travelers who are already passing by those locations.

## Features

- 🤖 Seamless Telegram integration with intuitive commands
- 📋 Natural language request creation and processing
- 📍 Location-based matching between buyers and travelers
- 💲 Bidding system for delivery fees
- 🔐 Secure OTP verification for delivery confirmation
- 📱 Real-time notifications for new requests and bids
- ⭐ Rating and review system for trust building

## Setup Instructions

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Start a chat with BotFather and send `/newbot`
3. Follow the prompts to choose a name and username for your bot
4. BotFather will provide a token for your bot - **save this token**

### 2. Get Gemini API Key (for AI-powered request parsing)

1. Visit the [Google AI Studio](https://aistudio.google.com/)
2. Create an account if you don't have one
3. Generate an API key for the Gemini model
4. Copy the API key

### 3. Set Up MongoDB Database

1. Create a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account or use an existing one
2. Create a new cluster and database
3. Get your MongoDB connection string

### 4. Configure Environment Variables

1. Copy the `.env.example` file to create a `.env` file:

   ```bash
   cp .env.example .env
   ```

2. Open the `.env` file and add your credentials:

   ```bash
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   MONGODB_URI=your_mongodb_connection_string
   PORT=3000
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

### 5. Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install

# Or using yarn
yarn install
```

## Running the Bot

### Development Mode

```bash
pnpm dev
```

This starts the bot with hot reloading enabled.

### Production Mode

```bash
pnpm build
pnpm start
```

## Bot Commands

- `/start` - Introduction and available commands
- `/newrequest` - Create a new delivery request as a buyer
- `/available` - Set your availability as a traveler
- `/listings` - View delivery requests near your location
- `/accept [request_id]` - Accept a specific delivery request
- `/status` - Check the status of your ongoing requests/deliveries

## Project Structure

```bash
bot/
├── src/
│   ├── index.ts                # Main entry point
│   ├── db.ts                   # Database connection
│   ├── state.ts                # User state management
│   ├── commands/               # Command handlers
│   │   ├── start.ts            # /start command
│   │   ├── newRequest.ts       # /newrequest command
│   │   ├── available.ts        # /available command
│   │   ├── listings.ts         # /listings command
│   │   ├── accept.ts           # /accept command
│   │   └── status.ts           # /status command
│   ├── handlers/               # Message handlers
│   │   ├── text.ts             # Text message handler
│   │   ├── location.ts         # Location message handler
│   │   └── callbackQuery.ts    # Inline button handler
│   ├── models/                 # MongoDB models
│   │   ├── User.ts             # User model
│   │   ├── Listing.ts          # Listing model
│   │   └── Bid.ts              # Bid model
│   └── utils/                  # Utility functions
│       ├── geocoding.ts        # Location services
│       └── gemini.ts           # Gemini AI integration
├── .env.example                # Example environment variables
├── package.json                # Project dependencies
└── tsconfig.json               # TypeScript configuration
```

## User Flow

### For Buyers

1. Create a delivery request with `/newrequest`
2. Provide item details, price, and location
3. Receive bids from travelers
4. Accept a bid and receive an OTP code
5. Share OTP with traveler upon delivery
6. Enter traveler's OTP to confirm delivery
7. Rate the traveler's service

### For Travelers

1. Set availability with `/available`
2. Browse nearby requests with `/listings`
3. Accept requests or place bids
4. Purchase and deliver the item
5. Exchange OTP codes with buyer
6. Receive payment confirmation
7. Rate the buyer

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
