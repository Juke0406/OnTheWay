# OnTheWay - Peer-to-Peer Delivery Platform

OnTheWay is a comprehensive peer-to-peer delivery platform that connects buyers with travelers to facilitate item delivery. The platform consists of a Telegram bot and a web application, both sharing the same MongoDB database for seamless integration.

![OnTheWay Banner](https://via.placeholder.com/1200x300/4F46E5/FFFFFF?text=OnTheWay+Delivery+Platform)

## 🌟 Overview

OnTheWay solves a common problem: buyers often want items from places they can't visit (e.g., a mall far away or overseas), while other people are already passing by or live near those areas. Our platform efficiently connects these two groups through:

1. **Telegram Bot**: For natural language request creation and management
2. **Web Application**: For comprehensive dashboard and map visualization
3. **Shared Database**: For seamless integration between both interfaces

## 🚀 Key Features

- 🤖 **Natural Language Processing**: Create delivery requests using natural language
- 📍 **Live Location Tracking**: Real-time location sharing and tracking
- 💰 **Mock Wallet System**: Simulate payments and escrow
- 🔐 **Secure Handoffs**: OTP verification for delivery confirmation
- ⭐ **Rating System**: Build trust through user ratings and reviews
- 🗺️ **Interactive 3D Map**: Visualize deliverers and requests in real-time
- 💲 **Bidding System**: Travelers can bid on delivery requests
- 📱 **Cross-Platform**: Use via Telegram or web interface

## 📂 Repository Structure

The repository is organized into two main components:

```
ontheway/
├── bot/                  # Telegram Bot
│   ├── src/              # Bot source code
│   ├── README.md         # Bot documentation
│   └── package.json      # Bot dependencies
└── webapp/               # Next.js Web Application
    ├── app/              # Next.js App Router
    ├── components/       # React components
    ├── models/           # MongoDB models
    ├── README.md         # Web app documentation
    └── package.json      # Web app dependencies
```

## 📋 Prerequisites

- Node.js 18.x or higher
- MongoDB database
- Telegram Bot Token (from BotFather)
- Google Maps API Key
- Google Gemini API Key (optional, for enhanced NLP)
- pnpm package manager (recommended)

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ontheway.git
cd ontheway
```

### 2. Set Up the Telegram Bot

```bash
cd bot
cp .env.example .env
# Edit .env with your configuration
pnpm install
pnpm dev
```

See the [bot README](bot/README.md) for detailed setup instructions.

### 3. Set Up the Web Application

```bash
cd webapp
cp .env.example .env.local
# Edit .env.local with your configuration
pnpm install
pnpm dev
```

See the [webapp README](webapp/README.md) for detailed setup instructions.

## 🔄 How It Works

### User Flow - Buyer

1. User creates a delivery request via Telegram bot or web app
2. System matches the request with available travelers nearby
3. Travelers bid on the request
4. Buyer accepts a bid
5. System generates OTP codes for both parties
6. Traveler picks up the item and delivers it to the buyer
7. Both parties confirm delivery with OTP codes
8. System releases payment (mock) and allows for ratings

### User Flow - Traveler

1. Traveler sets availability and location via bot or web app
2. System notifies traveler of nearby delivery requests
3. Traveler bids on requests they can fulfill
4. If accepted, traveler receives pickup details and OTP
5. Traveler delivers the item and exchanges OTP with buyer
6. System confirms successful delivery
7. Traveler receives payment (mock) and rating

## 📊 Database Models

The platform uses MongoDB with Mongoose for data storage. The main models are:

- **User**: Stores user information, wallet balance, and rating
- **Listing**: Stores delivery request details, status, and OTP codes
- **Bid**: Stores bid information for listings
- **Review**: Stores user reviews and ratings

## 🔐 Authentication

The platform uses Telegram authentication for both the bot and web app, ensuring a seamless user experience across both interfaces.

## 🚀 Deployment

### Telegram Bot

```bash
cd bot
pnpm build
pnpm start
```

### Web Application

```bash
cd webapp
pnpm build
pnpm start
```

## 🧪 Testing

Both the bot and web app include comprehensive testing suites to ensure reliability and performance.

### Bot Testing

```bash
cd bot
pnpm test
```

### Web App Testing

```bash
cd webapp
pnpm test
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

For any questions or feedback, please reach out to us at [contact@example.com](mailto:contact@example.com).
