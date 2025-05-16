import { auth } from "@/lib/auth";
import { User } from "@/models";
import { IUser } from "@/models/types";
import { Document } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

// Helper function to process the topup
async function processTopup(user: Document & IUser, topupAmount: number) {
  console.log("Processing topup for user:", user._id);
  console.log("Current wallet balance:", user.walletBalance);

  // Update wallet balance
  const currentBalance = user.walletBalance || 0;
  const newBalance = currentBalance + topupAmount;

  console.log("New wallet balance will be:", newBalance);

  // Update the user in the database
  await User.updateOne(
    { _id: user._id },
    { $set: { walletBalance: newBalance } }
  );

  console.log("Wallet top-up successful");

  // Return success response
  return NextResponse.json({
    success: true,
    message: "Wallet topped up successfully",
    newBalance,
  });
}

// POST /api/users/wallet/topup - Add funds to user's wallet
export async function POST(req: NextRequest) {
  try {
    console.log("Wallet top-up API called");

    // Get the session
    const session = await auth.api.getSession(req);

    if (!session) {
      console.log("No session found in wallet top-up API");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Session user ID:", session.user.id);

    // Parse request body
    const body = await req.json();
    const { amount } = body;

    console.log("Top-up amount:", amount);

    // Validate amount
    const topupAmount = parseFloat(amount);
    if (isNaN(topupAmount) || topupAmount <= 0) {
      console.log("Invalid amount:", amount);
      return NextResponse.json(
        { error: "Invalid amount. Please enter a positive number." },
        { status: 400 }
      );
    }

    // Find the user - use _id instead of userId
    const user = await User.findOne({ _id: session.user.id });

    if (!user) {
      console.log("User not found with ID:", session.user.id);

      // Try finding by telegramId as a fallback
      if (session.user.telegramId) {
        console.log(
          "Trying to find user by telegramId:",
          session.user.telegramId
        );
        const userByTelegramId = await User.findOne({
          telegramId: session.user.telegramId,
        });

        if (userByTelegramId) {
          console.log("User found by telegramId");
          return processTopup(userByTelegramId, topupAmount);
        }
      }

      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Process the topup for the found user
    return processTopup(user, topupAmount);
  } catch (error) {
    console.error("Error topping up wallet:", error);
    return NextResponse.json(
      { error: "Failed to top up wallet", details: String(error) },
      { status: 500 }
    );
  }
}
