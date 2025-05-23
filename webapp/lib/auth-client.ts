import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Determine the current hostname and protocol
const getCurrentHost = () => {
  if (typeof window === "undefined") {
    // Server-side rendering
    return process.env.NEXT_PUBLIC_APP_URL || "";
  } else {
    // Client-side rendering - use the current window location
    return `${window.location.protocol}//${window.location.host}`;
  }
};

// Get the base URL using the current host
const baseURL = getCurrentHost();

// Configure the auth client with appropriate settings for the environment
export const authClient = createAuthClient({
  baseURL: baseURL,
  // We don't need any client-side plugins for Telegram auth
  // since it's handled by the server-side callback
  cookieOptions: {
    // Use secure cookies for HTTPS
    secure: true,
    // Use lax for better compatibility
    sameSite: "lax",
    // Set path to root
    path: "/",
    // Don't set domain to ensure cookies work across subdomains
  },
  plugins: [
    inferAdditionalFields({
      user: {
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
    }),
  ],
});

export const { signIn, signOut, useSession } = authClient;
