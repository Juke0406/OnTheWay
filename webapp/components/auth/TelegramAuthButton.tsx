"use client";

import { LoginButton, TelegramAuthData } from "@telegram-auth/react";
import { useState } from "react";

interface TelegramAuthButtonProps {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function TelegramAuthButton({
  onSuccess,
  onError,
}: TelegramAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  // Get the bot name from environment variables
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";

  if (!botName) {
    console.error("Telegram bot name not configured");
    return (
      <div className="text-center text-red-500">
        Telegram bot name not configured
      </div>
    );
  }

  const handleAuthCallback = (data: TelegramAuthData) => {
    console.log("Telegram auth callback data:", data);
    // The LoginButton component will handle the redirect to the callback URL
    // The server will validate the data and create a session
    setLoading(false);
    // We don't need to call onSuccess here as the callback will handle the redirect
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground">
          Log in with your Telegram account
        </p>
      </div> */}

      <div className="grid grid-cols-1 gap-2 w-full">
        <div className="flex justify-center">
          <LoginButton
            botUsername={botName}
            authCallbackUrl={`${appUrl}/api/auth/telegram/callback`}
            buttonSize="large"
            cornerRadius={8}
            showAvatar={true}
            lang="en"
            onAuthCallback={handleAuthCallback}
          />
        </div>
      </div>
    </div>
  );
}
