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

    const { listingId: paramListingId } = await params;
    if (!paramListingId) {
      return NextResponse.json(
        { error: "Listing ID is required" },
        { status: 400 }
      );
    }

    const listing = await Listing.findOne({ listingId: paramListingId });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Authorization check (if needed)
    // ...

    // Find bids by the string Listing.listingId
    const bids = await Bid.find({ listingId: listing._id })
      .populate({
        path: "travelerId", // This specifies the field in Bid to be populated.
        // Mongoose will use the value of Bid.travelerId.
        model: User, // The model to populate from.
        foreignField: "telegramId", // The field in the User model to match against.
        localField: "travelerId", // The field in the Bid model whose value is used for matching.
        // (value of Bid.travelerId should match value of User.telegramId)
        select: "name username image rating telegramId", // Fields to select from User
      })
      .sort({ timestamp: -1 })
      .lean();

    if (bids.some((bid) => bid.travelerId && !(bid.travelerId as any).name)) {
      console.warn(
        "Some bids have travelerId populated but missing expected fields. Check User model and select fields."
      );
    }

    return NextResponse.json({ bids });
  } catch (error) {
    console.error("Error fetching bids for listing:", error);
    const errorDetails =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) };
    return NextResponse.json(
      { error: "Failed to fetch bids", details: errorDetails },
      { status: 500 }
    );
  }
}
