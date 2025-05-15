import { auth } from "@/lib/auth";
import { Bid, Listing, ListingStatus, User } from "@/models";
import { NextRequest, NextResponse } from "next/server";

// POST /api/listings/[listingId]/verify - Verify OTP and complete delivery
export async function POST(
  req: NextRequest,
  { params }: { params: { listingId: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId } = params;
    const { otp, role } = await req.json();

    // Find the listing
    const listing = await Listing.findOne({ listingId });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Check if the listing is in the matched state
    if (listing.status !== ListingStatus.MATCHED) {
      return NextResponse.json(
        { error: "Listing is not in the matched state" },
        { status: 400 }
      );
    }

    // Verify OTP based on role
    if (role === "buyer") {
      // Traveler is verifying buyer's OTP
      if (listing.otpBuyer !== otp) {
        return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
      }
    } else if (role === "traveler") {
      // Buyer is verifying traveler's OTP
      if (listing.otpTraveler !== otp) {
        return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
      }

      // Mark the delivery as confirmed
      await Listing.updateOne(
        { listingId },
        {
          status: ListingStatus.COMPLETED,
          deliveryConfirmed: true,
        }
      );

      // In a real application, we would handle the escrow release here
      // For this mock implementation, we'll just update the wallet balances

      // Find the bid to get the traveler's fee
      const bid = await Bid.findOne({ bidId: listing.acceptedBidId });

      if (bid) {
        // Update the traveler's wallet balance
        await User.updateOne(
          { userId: bid.travelerId },
          { $inc: { walletBalance: bid.proposedFee } }
        );
      }
    } else {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    return NextResponse.json({
      message: "OTP verified successfully",
      completed: role === "traveler",
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
