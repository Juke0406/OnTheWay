import { auth } from "@/lib/auth";
import { generateOTP } from "@/lib/utils";
import { Bid, BidStatus, Listing, ListingStatus } from "@/models";
import { NextRequest, NextResponse } from "next/server";

// POST /api/bids/[bidId]/accept - Accept a bid
export async function POST(
  req: NextRequest,
  { params }: { params: { bidId: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bidId } = await params;

    // Find the bid
    const bid = await Bid.findOne({ bidId });

    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    // Find the listing
    const listing = await Listing.findOne({ listingId: bid.listingId });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Check if the user is the buyer
    if (listing.buyerId !== session.user.id) {
      return NextResponse.json(
        { error: "You are not authorized to accept this bid" },
        { status: 403 }
      );
    }

    // Check if the listing is still open
    if (listing.status !== ListingStatus.OPEN) {
      return NextResponse.json(
        { error: "Listing is not open for bids" },
        { status: 400 }
      );
    }

    // Generate OTPs for buyer and traveler
    const otpBuyer = generateOTP();
    const otpTraveler = generateOTP();

    // Update the bid status
    await Bid.updateOne({ bidId }, { status: BidStatus.ACCEPTED });

    // Update the listing
    await Listing.updateOne(
      { listingId: bid.listingId },
      {
        status: ListingStatus.MATCHED,
        acceptedBidId: bidId,
        otpBuyer,
        otpTraveler,
      }
    );

    return NextResponse.json({
      message: "Bid accepted successfully",
      otpBuyer,
      otpTraveler,
    });
  } catch (error) {
    console.error("Error accepting bid:", error);
    return NextResponse.json(
      { error: "Failed to accept bid" },
      { status: 500 }
    );
  }
}
