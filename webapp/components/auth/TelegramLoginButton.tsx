"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

interface TelegramLoginButtonProps {
  onError?: (error: unknown) => void;
}

export function TelegramLoginButton({ onError }: TelegramLoginButtonProps) {
  const [loading, setLoading] = useState(false);

  // Direct link to Telegram OAuth
  const handleDirectTelegramLogin = () => {
    try {
      setLoading(true);
      const botId = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";

      if (!botId) {
        console.error(
          "Telegram bot ID not configured in environment variables"
        );

        // Fallback to using the Telegram login page
        window.location.href = `${appUrl}/telegram-login`;
        return;
      }

      // Generate a random nonce for security
      const nonce =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      // Store the nonce in sessionStorage for later verification
      sessionStorage.setItem("telegram_auth_nonce", nonce);

      // The callback URL where Telegram will redirect after authentication
      const callbackUrl = `${appUrl}/api/auth/telegram/callback`;

      // Create the Telegram OAuth URL exactly as specified
      let authUrl = "https://oauth.telegram.org/auth";
      authUrl += "?bot_id=" + encodeURIComponent(botId);

      // Extract domain for origin parameter (required)
      const originDomain = new URL(appUrl).hostname;
      authUrl += "&origin=" + encodeURIComponent(originDomain);

      // Add scope parameter
      authUrl += "&scope=write"; // You can adjust this as needed

      // Add public key parameter
      const publicKey = process.env.NEXT_PUBLIC_TELEGRAM_PUBLIC_KEY || "";
      if (publicKey) {
        authUrl += "&public_key=" + encodeURIComponent(publicKey);
      } else {
        console.warn(
          "No Telegram public key configured. Authentication may fail."
        );
      }

      // Add nonce for security
      authUrl += "&nonce=" + encodeURIComponent(nonce);

      // Add return_to parameter to specify where Telegram should redirect after auth
      authUrl += "&return_to=" + encodeURIComponent(callbackUrl);

      console.log("Opening Telegram OAuth link:", authUrl);

      // Redirect to Telegram OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error opening Telegram OAuth:", error);
      setLoading(false);
      onError?.(error);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground">
          Log in with your Telegram account
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 w-full">
        <Button
          variant="default"
          className="w-full flex items-center justify-center gap-2 bg-[#0088cc] hover:bg-[#0077b5]"
          onClick={handleDirectTelegramLogin}
          disabled={loading}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.5 4.5L2.5 12.5L21.5 20.5L21.5 4.5Z"></path>
            <path d="M12 12.5L21.5 4.5"></path>
            <path d="M2.5 12.5L12 12.5"></path>
            <path d="M12 12.5L21.5 20.5"></path>
            <path d="M12 12.5L12 19.5"></path>
          </svg>
          {loading ? "Connecting to Telegram..." : "Login with Telegram"}
        </Button>
      </div>
    </div>
  );
}
