# Product Requirements Document (PRD)

## Product Name

**OnTheWay** – Peer-to-peer delivery and shopping platform via web and Telegram

## Problem Statement

Buyers often want items from places they can't visit (e.g., a mall far away or overseas), while other people are already passing by or live near those areas. There is no efficient, trusted way to connect these two groups.

## Solution

A platform that matches buyers and travelers in real-time using a web dashboard and an AI-powered Telegram bot. Buyers list what they want, travelers get notified based on live location and availability, and a mock escrow process ensures both sides fulfill their end of the transaction.

## Goals & Objectives

- Enable natural-language listing creation via Telegram
- Allow buyers to deposit item cost into mock escrow
- Notify relevant travelers in real-time
- Enable fee bidding by travelers
- Require OTP verification for delivery completion
- Feature a public profile with ratings & reviews for both parties
- Provide full listing management via web app

---

## Core Features

### 1. **Buyer Experience**

- Natural language input via Telegram bot
- Intelligent parsing with Gemini
- Mock escrow deposit (no real payment integration)
- Accept or reject traveler bids
- OTP exchange for handoff confirmation
- Post-delivery reviews

### 2. **Traveler Experience**

- Set availability, location radius via web or bot
- Get notified of matching listings
- Bid higher if buyer's fee is low
- Buy the item using own funds
- Meet buyer, exchange OTP, get mock payout
- Post-delivery reviews

### 3. **Telegram Bot**

- Gemini integration to parse requests
- Guided multi-turn question system
- Live location sharing
- Accept/decline listings
- Submit bids

### 4. **Web App (Next.js)**

- Dashboard (My Listings, Opportunities, Wallet)
- Create & manage listings
- View profiles and reviews
- Admin panel for support, dispute resolution

### 5. **Backend (Node.js + MongoDB)**

- User auth & profiles
- Listings & matching engine
- Bidding & mock escrow system
- OTP generation & verification
- Review system

---

## Data Models (MongoDB)

### Users

- userId
- telegramId
- name
- rating
- reviews[]
- walletBalance (mock)

### Listings

- listingId
- buyerId
- itemDescription
- itemPrice
- pickupLocation
- destinationLocation
- maxFee
- bids[]
- status: [open, matched, completed, cancelled]
- acceptedBidId
- otpBuyer
- otpTraveler
- deliveryConfirmed

### Bids

- bidId
- travelerId
- listingId
- proposedFee
- timestamp
- status: [pending, accepted, declined]

### Reviews

- reviewId
- fromUserId
- toUserId
- rating (1–5)
- comment
- listingId

---

## Tech Stack

- **Frontend**: Next.js + shadcn/ui
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Bot**: Node.js (GramJS) or Python (Telethon)
- **AI**: Gemini Pro API
- **Location**: Google Maps API, Telegram live location
- **Auth**: Telegram login, optional email/phone OTP

---

## Task List

### 🔧 Backend

- [x] Set up MongoDB models (Users, Listings, Bids, Reviews)
- [x] User authentication (Telegram + JWT)
- [ ] CRUD API for Listings and Bids
- [x] Mock escrow logic: deposit, lock, release
- [ ] OTP generation & verification logic
- [ ] Matching engine (location + timing)
- [ ] Review system implementation

### 🧠 Gemini Integration

- [x] Setup Gemini Pro API access
- [x] Natural language parser for listing creation
- [x] Missing info handler & follow-up question generator
- [x] Structure converter (text to listing JSON)

### 🤖 Telegram Bot

- [x] Bot setup with Telegram Bot API
- [x] Handle /start, /newrequest, /available, /accept, /status
- [ ] Message parsing + Gemini integration
- [x] Multi-turn conversation for form filling
- [x] Live location sharing
- [x] Notifications for matched listings
- [x] Bidding UI with inline buttons
- [x] OTP exchange & submission
- [x] Confirmation and review prompts
- [x] Topup and wallet balance commands

### 🌐 Web App

- [x] Auth (Telegram login)
- [x] Dashboard with listing management
- [x] Submit new listings (fallback from bot)
- [x] Wallet and escrow status views (mocked)
- [ ] Admin panel (disputes, force release, user ban)
