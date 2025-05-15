import { auth } from "@/lib/auth";
import { User } from "@/models";
import { AuthDataValidator } from "@telegram-auth/server";
import { urlStrToAuthDataMap } from "@telegram-auth/server/utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";

  console.log("Telegram callback received:", req.url);

  // Import dbConnect
  const dbConnect = (await import("@/lib/mongoose")).default;

  if (!botToken) {
    console.error("Telegram Bot Token not configured!");
    return NextResponse.redirect(`${appUrl}/login?error=telegram_config_error`);
  }

  // Parse URL and query parameters
  const url = new URL(req.url);
  console.log("Received URL:", url.toString());

  try {
    // Ensure database connection is established
    await dbConnect();

    // Initialize the validator with the bot token
    const validator = new AuthDataValidator({ botToken });

    // Convert the URL to a map of auth data
    const authDataMap = urlStrToAuthDataMap(url.toString());
    console.log("Auth data map:", authDataMap);

    // Validate the data
    const telegramUser = await validator.validate(authDataMap);
    console.log("Telegram user validated:", telegramUser);

    // Extract user information from the validated data
    const { id, first_name, last_name, username, photo_url } = telegramUser;

    if (!id) {
      console.error("Missing user ID in validated data");
      return NextResponse.redirect(`${appUrl}/login?error=missing_parameters`);
    }

    const userId = id.toString();
    const firstName = first_name;
    const lastName = last_name;

    // If we made it here, the authentication is valid
    console.log("Telegram authentication valid!");

    // Construct user name
    const userName =
      `${firstName || ""} ${lastName || ""}`.trim() ||
      username ||
      `Telegram User ${userId}`;

    // Create or update the user in our database
    let dbUser = await User.findOne({
      telegramId: parseInt(userId.toString()),
    });

    if (!dbUser) {
      dbUser = await User.create({
        userId: userId.toString(),
        telegramId: parseInt(userId.toString()),
        name: userName,
        image: photo_url,
        rating: 0,
        walletBalance: 0,
      });

      console.log(`Created new user with Telegram ID: ${userId}`);
    } else {
      // Update the user's information
      dbUser = await User.findOneAndUpdate(
        { telegramId: parseInt(userId.toString()) },
        {
          name: userName,
          image: photo_url,
        },
        { new: true }
      );
    }

    // Create a session using Better Auth's approach
    if (dbUser) {
      try {
        // Create a session by signing in the user
        // We'll use the sign-in endpoint directly
        const signInRequest = new Request(`${appUrl}/api/auth/sign-in`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: dbUser.userId,
            telegramId: dbUser.telegramId,
            name: dbUser.name,
            image: dbUser.image,
          }),
        });

        // Process the sign-in request through the auth handler
        const signInResponse = await auth.handler(signInRequest);

        // Create a response for the redirect
        const response = NextResponse.redirect(`${appUrl}/dashboard`);

        // Get the Set-Cookie header from the sign-in response
        const setCookieHeader = signInResponse.headers.get("Set-Cookie");

        if (setCookieHeader) {
          // Copy the Set-Cookie header to our response
          response.headers.set("Set-Cookie", setCookieHeader);
          console.log("Session cookie copied from sign-in response");
        } else {
          console.warn("No Set-Cookie header found in sign-in response");
        }

        console.log("Session created successfully for user:", dbUser.userId);

        return response;
      } catch (error) {
        console.error("Error creating session:", error);
        return NextResponse.redirect(`${appUrl}/login?error=session_error`);
      }
    }
  } catch (error) {
    console.error("Error processing Telegram authentication:", error);
  }

  console.error("Authentication failed");
  return NextResponse.redirect(`${appUrl}/login?error=auth_failed`);
}
