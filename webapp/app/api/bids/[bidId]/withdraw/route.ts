import { auth } from "@/lib/auth";
import { Bid, BidStatus, Listing, ListingStatus } from "@/models";
import { NextRequest, NextResponse } from "next/server";

// POST /api/bids/:bidId/withdraw - Traveler withdraws their bid
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

    if (bid.travelerId.toString() !== session.user.id.toString()) {
      return NextResponse.json(
        { error: "You are not authorized to withdraw this bid" },
        { status: 403 }
      );
    }

    if (bid.status !== BidStatus.PENDING) {
      return NextResponse.json(
        { error: "Only pending bids can be withdrawn" },
        { status: 400 }
      );
    }

    const listing = bid.listingId as any; // Type assertion after population
    if (!listing || listing.status !== ListingStatus.OPEN) {
      return NextResponse.json(
        { error: "Bids can only be withdrawn for open listings" },
        { status: 400 }
      );
    }

    // For simplicity, mark as declined. Could introduce a 'WITHDRAWN' status.
    bid.status = BidStatus.DECLINED;
    await bid.save();

    return NextResponse.json({
      message: "Bid withdrawn successfully",
      bid,
    });
  } catch (error) {
    console.error("Error withdrawing bid:", error);
    return NextResponse.json(
      { error: "Failed to withdraw bid" },
      { status: 500 }
    );
  }
}
