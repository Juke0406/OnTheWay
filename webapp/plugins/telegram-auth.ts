import { createHash, createHmac } from "crypto";
import { User } from "../models";

interface TelegramAuthOptions {
  botToken: string;
  domain: string;
}

// Helper to generate placeholder emails for Telegram users
const createPlaceholderEmail = (telegramUserId: string): string => {
  return `tg_${telegramUserId}@placeholder.telegram.user`;
};

export const telegramAuth = (options: TelegramAuthOptions) => {
  return {
    name: "telegram-auth",

    routes: [
      {
        path: "/api/auth/telegram/callback",
        method: "GET",
        handler: async (req: Request) => {
          if (!options.botToken) {
            console.error("Telegram Bot Token not configured!");
            return Response.redirect(
              `${options.domain}/login?error=telegram_config_error`
            );
          }

          // Parse URL parameters
          const url = new URL(req.url);
          const params = url.searchParams;

          // Check for bot-initiated authentication
          const source = params.get("source");
          const telegramId = params.get("telegram_id");

          if (source === "bot" && telegramId) {
            console.log("Bot-initiated authentication detected");
            // Skip hash verification for bot-initiated auth
            // Continue with the authentication flow
          } else {
            // Check for payload and hash parameters (Telegram OAuth format)
            const hash = params.get("hash");
            const payload = params.get("payload");

            if (payload && hash) {
              console.log(
                "Telegram OAuth callback detected with payload parameter"
              );

              // Verify the hash
              const secretKey = createHash("sha256")
                .update(options.botToken)
                .digest();
              const checkHash = createHmac("sha256", secretKey)
                .update(payload)
                .digest("hex");

              console.log(
                "Calculated hash:",
                checkHash.substring(0, 10) + "..."
              );
              console.log("Received hash:  ", hash.substring(0, 10) + "...");

              if (hash !== checkHash) {
                console.warn("Telegram hash verification failed!");
                return Response.redirect(
                  `${options.domain}/login?error=telegram_auth_failed`
                );
              }

              // Parse the payload
              try {
                const userData = JSON.parse(
                  Buffer.from(payload, "base64").toString()
                );

                // Extract user information and add to params
                const user = userData.user;
                if (user && user.id) {
                  params.set("id", user.id.toString());
                  params.set("first_name", user.first_name || "");
                  if (user.last_name) params.set("last_name", user.last_name);
                  if (user.username) params.set("username", user.username);
                  if (user.photo_url) params.set("photo_url", user.photo_url);
                  params.set(
                    "auth_date",
                    userData.auth_date?.toString() ||
                      Math.floor(Date.now() / 1000).toString()
                  );
                } else {
                  console.error("Invalid user data in payload");
                  return Response.redirect(
                    `${options.domain}/login?error=telegram_invalid_user_data`
                  );
                }
              } catch (error) {
                console.error("Error parsing payload:", error);
                return Response.redirect(
                  `${options.domain}/login?error=telegram_invalid_payload`
                );
              }
            } else {
              // Legacy format - check for hash parameter
              const hash = params.get("hash");

              if (!hash) {
                return Response.redirect(
                  `${options.domain}/login?error=telegram_missing_hash`
                );
              }

              // Collect all parameters except hash
              const telegramUserData: Record<string, string> = {};
              params.forEach((value, key) => {
                if (key !== "hash") {
                  telegramUserData[key] = value;
                }
              });

              // --- 1. Verify Telegram Hash ---
              const dataCheckArr: string[] = [];
              Object.keys(telegramUserData)
                .sort()
                .forEach((key) => {
                  dataCheckArr.push(`${key}=${telegramUserData[key]}`);
                });

              const dataCheckString = dataCheckArr.join("\n");
              const secretKey = createHash("sha256")
                .update(options.botToken)
                .digest();

              const calculatedHash = createHmac("sha256", secretKey)
                .update(dataCheckString)
                .digest("hex");

              if (calculatedHash !== hash) {
                console.warn("Telegram hash verification failed!");
                return Response.redirect(
                  `${options.domain}/login?error=telegram_auth_failed`
                );
              }
            }
          }

          try {
            // Skip auth_date check for bot-initiated authentication
            if (source === "bot" && telegramId) {
              console.log(
                "Skipping auth_date check for bot-initiated authentication"
              );
            } else {
              // --- Check auth_date ---
              const authDate = params.get("auth_date");
              if (authDate) {
                const timestamp = parseInt(authDate, 10);
                const now = Math.floor(Date.now() / 1000);
                const timeDiff = now - timestamp;

                // 5 minute validity window
                if (timeDiff > 300) {
                  console.warn("Telegram auth_date is too old!");
                  return Response.redirect(
                    `${options.domain}/login?error=telegram_auth_expired`
                  );
                }
              } else {
                return Response.redirect(
                  `${options.domain}/login?error=telegram_auth_timestamp_missing`
                );
              }
            }

            // --- Hash is valid, proceed with authentication ---
            let telegramUserId = params.get("id");

            // For bot-initiated auth, use the telegram_id parameter
            if (source === "bot" && telegramId) {
              telegramUserId = telegramId;
            }

            if (!telegramUserId) {
              return Response.redirect(
                `${options.domain}/login?error=telegram_id_missing`
              );
            }

            // Construct user data
            let userName;

            if (source === "bot" && telegramId) {
              // For bot-initiated auth, we don't have name information
              userName = `Telegram User ${telegramUserId}`;
            } else {
              userName =
                `${params.get("first_name") || ""} ${
                  params.get("last_name") || ""
                }`.trim() ||
                params.get("username") ||
                `Telegram User ${telegramUserId}`;
            }

            // Create a corresponding user in our Mongoose model
            let user = await User.findOne({
              telegramId: parseInt(telegramUserId),
            });

            if (!user) {
              user = await User.create({
                userId: telegramUserId, // We'll use the Telegram ID as the user ID for now
                telegramId: parseInt(telegramUserId),
                name: userName,
                image: params.get("photo_url") || undefined,
                rating: 0,
                walletBalance: 0,
              });

              console.log(
                `Created new user with Telegram ID: ${telegramUserId}`
              );
            } else {
              // Update the user's information
              user = await User.findOneAndUpdate(
                { telegramId: parseInt(telegramUserId) },
                {
                  name: userName,
                  image: params.get("photo_url") || undefined,
                },
                { new: true }
              );
            }

            // Create a session and set cookies
            try {
              // Create a redirect response
              const response = Response.redirect(`${options.domain}/dashboard`);

              // Check if user exists
              if (user) {
                // In a real implementation, we would create a session and set cookies here
                // For now, we'll just redirect to the dashboard with the user ID
                return Response.redirect(
                  `${options.domain}/dashboard?auth=telegram&id=${user.telegramId}`
                );
              }

              return response;
            } catch (sessionError) {
              console.error("Error creating session:", sessionError);
              // Fallback to a simple redirect
              return Response.redirect(
                `${options.domain}/dashboard?auth=telegram&id=${telegramUserId}`
              );
            }
          } catch (error) {
            console.error("Error during Telegram auth callback:", error);
            return Response.redirect(
              `${options.domain}/login?error=server_error`
            );
          }
        },
      },
    ],
  };
};
