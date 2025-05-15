import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";
import { telegramAuth } from "../plugins/telegram-auth";
import dbConnect from "./mongoose";

// Ensure database connection
dbConnect();

// Get the MongoDB connection
const db = mongoose.connection.db;

export const auth = betterAuth({
  // Configure the MongoDB adapter
  database: mongodbAdapter(db),
  // Enable email and password authentication as a fallback
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  // Add custom fields to the user schema
  user: {
    additionalFields: {
      telegramId: {
        type: "number",
        required: false,
      },
      walletBalance: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false, // Don't allow users to set this directly
      },
      rating: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false, // Don't allow users to set this directly
      },
    },
  },

  // Add the Telegram authentication plugin
  plugins: [
    telegramAuth({
      botToken: process.env.TELEGRAM_BOT_TOKEN as string,
      // The domain that was set in BotFather
      domain: process.env.NEXT_PUBLIC_APP_URL as string,
    }),
  ],

  // Configure session settings
  session: {
    // 30 days in seconds
    maxAge: 30 * 24 * 60 * 60,
    // Explicitly set cookie options for better compatibility
    cookieOptions: {
      httpOnly: true,
      secure: true, // Required for localhost with HTTPS
      sameSite: "lax",
      path: "/",
    },
  },
});
