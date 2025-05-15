import { createAuthEndpoint } from "better-auth/api";
import type { BetterAuthPlugin } from "better-auth/types";
import * as crypto from "crypto";
import { User } from "../models";

// Helper function to convert base64 to string
const base64ToString = (base64: string): string => {
  try {
    // For browser environments
    return atob(base64);
  } catch (e) {
    // Fallback for other environments
    return Buffer.from(base64, "base64").toString();
  }
};

// The session expiration time (30 days by default)
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

// Helper to generate placeholder emails
const createPlaceholderEmail = (telegramUserId: string): string => {
  return `tg_${telegramUserId}@placeholder.telegram.user`;
};

export const telegramPlugin = ({ botToken }: { botToken: string }) => {
  return {
    id: "telegram",
    endpoints: {
      telegramCallback: createAuthEndpoint(
        "/telegram/callback",
        { method: "GET", requireRequest: true },

        async ({
          request,
          context: { adapter, internalAdapter, createAuthCookie },
          redirect,
          // We don't need setCookie as we're using setSignedCookie
          setSignedCookie,
        }) => {
          console.log("Processing Telegram callback with Better Auth plugin");
          if (!botToken) {
            console.error("Telegram Bot Token not configured!");
            return new Response("Server configuration error", { status: 500 });
          }

          const url = new URL(request?.url);
          const params = url.searchParams;

          // Check for bot-initiated authentication
          const source = params.get("source");
          const telegramId = params.get("telegram_id");

          let telegramUserId: string | null = null;
          let userName: string = "";
          let photoUrl: string | null = null;

          if (source === "bot" && telegramId) {
            console.log("Bot-initiated authentication detected");
            // Skip hash verification for bot-initiated auth
            telegramUserId = telegramId;
            userName = `Telegram User ${telegramUserId}`;
          } else {
            // Check for payload and hash parameters (Telegram OAuth format)
            const hash = params.get("hash");
            const payload = params.get("payload");

            if (payload && hash) {
              console.log(
                "Telegram OAuth callback detected with payload parameter"
              );

              // Verify the hash
              const secretKey = crypto
                .createHash("sha256")
                .update(botToken)
                .digest();
              const checkHash = crypto
                .createHmac("sha256", secretKey)
                .update(payload)
                .digest("hex");

              if (hash !== checkHash) {
                console.warn("Telegram hash verification failed!");
                return redirect("/login?error=telegram_auth_failed");
              }

              // Parse the payload
              try {
                // Use the base64ToString helper to decode the payload
                const payloadString = base64ToString(payload);
                const userData = JSON.parse(payloadString);

                // Extract user information
                const user = userData.user;
                if (user && user.id) {
                  telegramUserId = user.id.toString();
                  userName =
                    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                    user.username ||
                    `Telegram User ${telegramUserId}`;
                  photoUrl = user.photo_url || null;
                } else {
                  console.error("Invalid user data in payload");
                  return redirect("/login?error=telegram_invalid_user_data");
                }
              } catch (error) {
                console.error("Error parsing payload:", error);
                return redirect("/login?error=telegram_invalid_payload");
              }
            } else {
              // Legacy format - check for hash parameter
              const hash = params.get("hash");

              if (!hash) {
                return redirect("/login?error=telegram_missing_hash");
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

              const secretKey = crypto
                .createHash("sha256")
                .update(botToken)
                .digest();

              const calculatedHash = crypto
                .createHmac("sha256", secretKey)
                .update(dataCheckString)
                .digest("hex");

              if (calculatedHash !== hash) {
                console.warn("Telegram hash verification failed!");
                return redirect("/login?error=telegram_auth_failed");
              }

              // Extract user information
              telegramUserId = params.get("id");
              userName =
                `${params.get("first_name") || ""} ${
                  params.get("last_name") || ""
                }`.trim() ||
                params.get("username") ||
                `Telegram User ${telegramUserId}`;
              photoUrl = params.get("photo_url");
            }

            // Skip auth_date check for bot-initiated authentication
            if (!(source === "bot" && telegramId)) {
              // --- Check auth_date ---
              const authDate = params.get("auth_date");
              if (authDate) {
                const timestamp = parseInt(authDate, 10);
                const now = Math.floor(Date.now() / 1000);
                const timeDiff = now - timestamp;
                if (timeDiff > 300) {
                  // 5 minute validity window
                  console.warn("Telegram auth_date is too old!");
                  return redirect("/login?error=telegram_auth_expired");
                }
              } else {
                return redirect("/login?error=telegram_auth_timestamp_missing");
              }
            }
          }

          if (!telegramUserId) {
            return redirect("/login?error=telegram_id_missing");
          }

          try {
            // Check if the user exists in our Mongoose model (for backward compatibility with existing users)
            // We only update existing users here, but don't create new ones directly in the User model
            let dbUser = await User.findOne({
              telegramId: parseInt(telegramUserId),
            });

            if (dbUser) {
              // Update the user's information if they exist
              dbUser = await User.findOneAndUpdate(
                { telegramId: parseInt(telegramUserId) },
                {
                  name: userName,
                  image: photoUrl || undefined,
                },
                { new: true }
              );
              console.log(
                `Updated existing user with Telegram ID: ${telegramUserId}`
              );
            }
            // Note: We'll create the user via adapter.create if they don't exist

            // Make sure adapter is defined before using it
            if (!adapter) {
              console.error("Adapter is undefined in Telegram auth plugin");
              return redirect("/login?error=server_configuration_error");
            }

            // Step 1: Check for an existing account in Better Auth
            const existingAccount = (await adapter.findOne({
              model: "account",
              where: [
                { field: "providerId", value: "telegram" },
                { field: "accountId", value: telegramUserId.toString() }, // Ensure we're looking up with a string
              ],
              select: ["userId"],
            })) as { userId: string } | null;

            let userId: string;
            let userJustCreated = false;

            if (existingAccount) {
              // Step 2a: Account exists, use the linked user
              userId = existingAccount.userId;
              console.log(
                `Found existing Better Auth user (${userId}) via Telegram account.`
              );
            } else {
              // Step 2b: No account found, create a new user and link the account
              console.log(
                `No existing Better Auth account found for ${telegramUserId}. Creating new user.`
              );
              userJustCreated = true;

              // Make sure adapter is defined before using it
              if (!adapter) {
                console.error(
                  "Adapter is undefined in Telegram auth plugin when creating user"
                );
                return redirect("/login?error=server_configuration_error");
              }

              // Create the user in Better Auth (this is the only place where users should be created)
              const newUser = await adapter.create({
                model: "user",
                data: {
                  name: userName,
                  email: createPlaceholderEmail(telegramUserId),
                  emailVerified: false,
                  image: photoUrl || null,
                  telegramId: parseInt(telegramUserId),
                  userId: telegramUserId.toString(), // Match the format in your MongoDB
                  walletBalance: 0,
                  rating: 0,
                },
              });

              userId = newUser.id;
              console.log(`Created new Better Auth user with ID: ${userId}`);

              // Link the Telegram account to the new user
              await adapter.create({
                model: "account",
                data: {
                  userId: userId,
                  providerId: "telegram",
                  accountId: telegramUserId.toString(), // Ensure accountId is a string
                },
              });

              console.log(
                `Linked Telegram account ${telegramUserId} to user ${userId}`
              );
            }

            // Make sure internalAdapter is defined before using it
            if (!internalAdapter) {
              console.error(
                "internalAdapter is undefined in Telegram auth plugin"
              );
              return redirect("/login?error=server_configuration_error");
            }

            // Create a session
            const session = await internalAdapter.createSession(
              userId,
              request
            );

            // Make sure createAuthCookie is defined
            if (!createAuthCookie) {
              console.error(
                "createAuthCookie is undefined in Telegram auth plugin"
              );
              return redirect("/login?error=server_configuration_error");
            }

            const cookie = createAuthCookie("session_token", {
              maxAge: SESSION_MAX_AGE,
            });

            console.log("Cookie attributes:", cookie.attributes);

            // Make sure setSignedCookie is defined
            if (!setSignedCookie) {
              console.error(
                "setSignedCookie is undefined in Telegram auth plugin"
              );
              return redirect("/login?error=server_configuration_error");
            }

            // Set the cookie with a signed cookie for better security
            await setSignedCookie(
              cookie.name,
              session.token,
              process.env.BETTER_AUTH_SECRET!,
              cookie.attributes
            );

            console.log("Signed session cookie set with name:", cookie.name);
            console.log("Session token:", session.token);

            // Redirect based on user status
            const redirectTo = userJustCreated
              ? "/dashboard?new=true"
              : "/dashboard";
            return redirect(redirectTo);
          } catch (error) {
            console.error("Error during Telegram auth callback:", error);
            if (error instanceof Error) {
              console.error(error.message);
              console.error(error.stack);
            }
            return redirect("/login?error=server_error");
          }
        }
      ),
    },
  } satisfies BetterAuthPlugin;
};
