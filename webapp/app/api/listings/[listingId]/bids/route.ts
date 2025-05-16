import { auth } from "@/lib/auth";
import { Bid, Listing, User } from "@/models";
import { NextRequest, NextResponse } from "next/server";

// GET /api/listings/:listingId/bids - Get all bids for a specific listing
export async function GET(
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

    // For now, only the buyer can see all bids.
    // Or, if the listing is matched, the traveler involved might see their bid.
    // Add more sophisticated logic if needed.
    // if (listing.buyerId.toString() !== session.user.id.toString()) {
    //   return NextResponse.json(
    //     { error: "You are not authorized to view bids for this listing" },
    //     { status: 403 }
    //   );
    // }

    const bids = await Bid.find({ listingId: listing.listingId }) // Use listing.listingId (UUID) if bids store that, or listing._id if bids store ObjectId
      .populate<{ travelerId: typeof User }>({
        path: "travelerId",
        select: "name username image rating telegramId",
      })
      .sort({ timestamp: -1 }) // Or proposedFee, etc.
      .lean();

    return NextResponse.json({ bids });
  } catch (error) {
    console.error("Error fetching bids for listing:", error);
    return NextResponse.json(
      { error: "Failed to fetch bids" },
      { status: 500 }
    );
  }
}
