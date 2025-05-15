import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";
import { telegramPlugin } from "../plugins/telegram-auth-plugin";
import dbConnect from "./mongoose";

// Create a function to initialize the auth handler
// This ensures we have a valid database connection before creating the handler
const initializeAuthHandler = async () => {
  // Wait for the database connection to be established
  try {
    await dbConnect();
    console.log("MongoDB connected successfully for Better Auth");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err; // Re-throw to prevent initialization with a bad connection
  }

  // Now we can safely access the database
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB connection is not available");
  }

  // Create the auth handler with the confirmed database connection
  return betterAuth({
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
        username: {
          type: "string",
          required: true,
          input: true,
        },
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
      telegramPlugin({
        botToken: process.env.TELEGRAM_BOT_TOKEN as string,
      }),
    ],

    // Configure session settings
    session: {
      expiresIn: 30 * 24 * 60 * 60, // 30 days in seconds
      updateAge: 24 * 60 * 60, // 1 day - update session expiration every day
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes cache
      },
    },
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        secure: true, // Required for HTTPS
        sameSite: "lax", // Use "lax" for better compatibility with Cloudflare Tunnel
        path: "/",
        // Don't set domain to ensure cookies work across all environments
      },
    },
  });
};

// Initialize the auth handler
const authHandlerPromise = initializeAuthHandler();

// Create a wrapped handler with debug logging that ensures the auth handler is initialized
export const auth = {
  // We'll implement the handler method that waits for initialization
  handler: async (req: Request) => {
    console.log("Better Auth handler called with URL:", req.url);
    try {
      // Wait for the auth handler to be initialized
      const authHandler = await authHandlerPromise;

      // Now we can safely use the handler
      const response = await authHandler.handler(req);
      console.log("Better Auth handler completed successfully");
      return response;
    } catch (error) {
      console.error("Error in Better Auth handler:", error);
      throw error;
    }
  },

  // Proxy the API methods that are used in the codebase
  api: {
    async getSession(req: Request) {
      try {
        const authHandler = await authHandlerPromise;

        // Try to get the session with cache disabled
        const url = new URL(req.url);
        url.searchParams.set("disableCookieCache", "true");

        // Create a new request with the updated URL
        const requestWithoutCache = new Request(url.toString(), {
          headers: req.headers,
          method: req.method,
        });

        return await authHandler.api.getSession(requestWithoutCache);
      } catch (error) {
        console.error("Error in auth.api.getSession:", error);
        throw error;
      }
    },
  },
};
