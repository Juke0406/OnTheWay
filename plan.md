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

- [ ] Set up MongoDB models (Users, Listings, Bids, Reviews)
- [ ] User authentication (Telegram + JWT)
- [ ] CRUD API for Listings and Bids
- [ ] Mock escrow logic: deposit, lock, release
- [ ] OTP generation & verification logic
- [ ] Matching engine (location + timing)
- [ ] Review system implementation

### 🧠 Gemini Integration

- [ ] Setup Gemini Pro API access
- [ ] Natural language parser for listing creation
- [ ] Missing info handler & follow-up question generator
- [ ] Structure converter (text to listing JSON)

### 🤖 Telegram Bot

- [ ] Bot setup with Telegram Bot API
- [ ] Handle /start, /newrequest, /available, /accept, /status
- [ ] Message parsing + Gemini integration
- [ ] Multi-turn conversation for form filling
- [ ] Live location sharing
- [ ] Notifications for matched listings
- [ ] Bidding UI with inline buttons
- [ ] OTP exchange & submission
- [ ] Confirmation and review prompts

### 🌐 Web App

- [ ] Auth (Telegram login)
- [ ] Dashboard with listing management
- [ ] View and accept/reject bids
- [ ] Submit new listings (fallback from bot)
- [ ] Profile pages with review history
- [ ] Wallet and escrow status views (mocked)
- [ ] Admin panel (disputes, force release, user ban)

### 📦 DevOps & Infra

- [ ] CI/CD for Next.js frontend (Vercel)
- [ ] API deployment with Fly.io or Railway
- [ ] MongoDB Atlas integration
- [ ] Telegram bot hosting on Render

---

## Milestones

| Phase   | Timeline  | Features                                          |
| ------- | --------- | ------------------------------------------------- |
| Phase 1 | Week 1–3  | Telegram bot MVP, Gemini parsing, listing flow    |
| Phase 2 | Week 4–6  | Backend API, DB models, OTP + escrow logic (mock) |
| Phase 3 | Week 7–8  | Web app dashboard, bid system, review flow        |
| Phase 4 | Week 9–10 | Final integrations, QA, deployment                |

---
