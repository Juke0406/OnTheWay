# OnTheWay Web Application

A Next.js web application for the OnTheWay peer-to-peer delivery platform. This web app provides a dashboard for managing delivery requests, tracking deliveries, and managing your wallet.

## 🌟 Features

- 🔐 Telegram authentication integration
- 🗺️ Interactive 3D map with real-time location tracking
- 📋 Listing management (create, view, edit, delete)
- 💰 Mock wallet system for simulating payments
- 📱 Responsive design for mobile and desktop
- 🌐 Google Maps integration for location services
- 🔔 Real-time notifications for matched listings
- 💲 Bidding system for delivery requests
- ⭐ Rating and review system

## 📋 Prerequisites

- Node.js 18.x or higher
- MongoDB database
- Telegram Bot Token (from BotFather)
- Google Maps API Key
- pnpm package manager (recommended)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/ontheway.git
cd ontheway/webapp
```

### 2. Configure Environment Variables

1. Copy the `.env.example` file to create a `.env.local` file:

```bash
cp .env.example .env.local
```

2. Open the `.env.local` file and add your configuration:

```bash
# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/ontheway

# Better Auth Secret (generate a strong random string)
BETTER_AUTH_SECRET=your_strong_random_string_here

# Better Auth URL (your app's base URL - should match NEXT_PUBLIC_APP_URL)
BETTER_AUTH_URL=${NEXT_PUBLIC_APP_URL}

# Telegram Bot Token (from BotFather)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Telegram Bot Name (without the @ symbol)
NEXT_PUBLIC_TELEGRAM_BOT_NAME=your_bot_name

# Telegram Bot ID (numeric part before the colon in the bot token)
NEXT_PUBLIC_TELEGRAM_BOT_ID=your_bot_id

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

For tunneling to expose your local server to the internet (useful for Telegram webhook testing):

```bash
pnpm tunnel
```

## 🏗️ Project Structure

```
webapp/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Authentication routes
│   │   └── login/          # Login page
│   ├── (dashboard)/        # Dashboard routes
│   │   ├── dashboard/      # Dashboard page
│   │   └── map/            # Map page
│   ├── api/                # API routes
│   │   ├── auth/           # Authentication API
│   │   ├── listings/       # Listings API
│   │   ├── bids/           # Bids API
│   │   └── users/          # Users API
│   ├── globals.css         # Global CSS
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── ui/                 # UI components (shadcn/ui)
│   ├── dashboard-content/  # Dashboard components
│   ├── listing-form/       # Listing form components
│   └── map/                # Map components
├── lib/                    # Utility functions
│   ├── auth.ts             # Authentication configuration
│   └── utils.ts            # Utility functions
├── models/                 # MongoDB models
│   ├── User.ts             # User model
│   ├── Listing.ts          # Listing model
│   ├── Bid.ts              # Bid model
│   └── Review.ts           # Review model
├── plugins/                # Authentication plugins
│   └── telegram-auth-plugin.ts # Telegram authentication
├── public/                 # Static files
├── .env.example            # Example environment variables
├── next.config.ts          # Next.js configuration
└── package.json            # Project dependencies
```

## 🔄 API Routes

The web app provides the following API routes:

### Authentication

- `GET/POST /api/auth/[...auth]` - Authentication endpoints
- `GET /api/auth/telegram/callback` - Telegram authentication callback

### Listings

- `GET /api/listings` - Get user's listings
- `POST /api/listings` - Create a new listing
- `GET /api/listings/all` - Get all available listings
- `GET /api/listings/:listingId` - Get a specific listing
- `PUT /api/listings/:listingId` - Update a listing
- `DELETE /api/listings/:listingId` - Delete a listing

### Bids

- `GET /api/bids` - Get user's bids
- `POST /api/bids` - Create a new bid
- `GET /api/bids/:bidId` - Get a specific bid
- `POST /api/bids/:bidId/accept` - Accept a bid

### Users

- `GET /api/users/available` - Get available users for delivery

## 📱 Pages

### Login Page

The login page provides Telegram authentication for users. It uses the Telegram OAuth flow to authenticate users and create a session.

### Map Page

The map page displays an interactive 3D map with real-time location tracking. It shows available deliverers, pickup and destination locations, and allows users to create new listings.

### Dashboard Page

The dashboard page provides a comprehensive view of the user's listings, opportunities, and history. It allows users to manage their listings, view their wallet balance, and track their deliveries.

## 🔐 Authentication

The web app uses Better Auth for authentication, with a custom Telegram authentication plugin. This allows users to log in with their Telegram account and access the platform.

## 📊 Database Models

The web app uses MongoDB with Mongoose for data storage. The main models are:

- **User**: Stores user information, wallet balance, and rating
- **Listing**: Stores delivery request details, status, and OTP codes
- **Bid**: Stores bid information for listings
- **Review**: Stores user reviews and ratings

## 🔄 Integration with Telegram Bot

The web app shares the same MongoDB database with the Telegram bot, allowing for seamless integration between the two platforms. Users can create requests via the bot and manage them on the web app, or vice versa.

## 🚀 Deployment

The web app can be deployed to any platform that supports Next.js, such as Vercel, Netlify, or a custom server.

For production deployment:

```bash
pnpm build
pnpm start
```

## 📄 License

MIT
