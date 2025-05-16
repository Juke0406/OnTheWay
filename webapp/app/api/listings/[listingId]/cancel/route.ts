import { auth } from "@/lib/auth";
import { Listing, ListingStatus } from "@/models";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

// POST /api/listings/:listingId/cancel - Cancel a listing
export async function POST(
  req: NextRequest,
  { params }: { params: { listingId: string } }
) {
  try {
    const session = await auth.api.getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId } = params;
    if (!listingId) {
      return NextResponse.json(
        { error: "Listing ID is required" },
        { status: 400 }
      );
    }

    const listing = await Listing.findOne({ listingId });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.buyerId.toString() !== session.user.id.toString()) {
      return NextResponse.json(
        { error: "You are not authorized to cancel this listing" },
        { status: 403 }
      );
    }

    if (listing.status !== ListingStatus.OPEN) {
      return NextResponse.json(
        { error: "Only open listings can be cancelled" },
        { status: 400 }
      );
    }

    listing.status = ListingStatus.CANCELLED;
    await listing.save();

    // Optionally, decline all pending bids for this listing
    // await Bid.updateMany({ listingId: listing._id, status: BidStatus.PENDING }, { status: BidStatus.DECLINED });

    return NextResponse.json({
      message: "Listing cancelled successfully",
      listing,
    });
  } catch (error) {
    console.error("Error cancelling listing:", error);
    return NextResponse.json(
      { error: "Failed to cancel listing" },
      { status: 500 }
    );
  }
}
