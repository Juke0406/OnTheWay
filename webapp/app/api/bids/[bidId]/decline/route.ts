import { auth } from "@/lib/auth";
import { Bid, BidStatus, Listing, ListingStatus } from "@/models";
import { NextRequest, NextResponse } from "next/server";

// POST /api/bids/:bidId/decline - Buyer declines a bid
export async function POST(
  req: NextRequest,
  { params }: { params: { bidId: string } }
) {
  try {
    const session = await auth.api.getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bidId } = params;
    if (!bidId) {
      return NextResponse.json(
        { error: "Bid ID is required" },
        { status: 400 }
      );
    }

    const bid = await Bid.findOne({ bidId }).populate("listingId");

    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    const listing = bid.listingId as any; // Type assertion after population
    if (!listing) {
      return NextResponse.json(
        { error: "Associated listing not found" },
        { status: 404 }
      );
    }

    if (listing.buyerId.toString() !== session.user.id.toString()) {
      return NextResponse.json(
        { error: "You are not authorized to decline this bid" },
        { status: 403 }
      );
    }

    if (listing.status !== ListingStatus.OPEN) {
      return NextResponse.json(
        { error: "Bids can only be declined for open listings" },
        { status: 400 }
      );
    }

    if (bid.status !== BidStatus.PENDING) {
      return NextResponse.json(
        { error: "Only pending bids can be declined" },
        { status: 400 }
      );
    }

    bid.status = BidStatus.DECLINED;
    await bid.save();

    return NextResponse.json({
      message: "Bid declined successfully",
      bid,
    });
  } catch (error) {
    console.error("Error declining bid:", error);
    return NextResponse.json(
      { error: "Failed to decline bid" },
      { status: 500 }
    );
  }
}
