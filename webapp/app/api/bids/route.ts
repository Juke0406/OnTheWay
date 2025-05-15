import { auth } from "@/lib/auth";
import { Bid, BidStatus, Listing, ListingStatus } from "@/models";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// GET /api/bids - Get all bids for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get bids where the user is the traveler
    const bids = await Bid.find({
      travelerId: session.user.id,
    });

    return NextResponse.json({ bids });
  } catch (error) {
    console.error("Error fetching bids:", error);
    return NextResponse.json(
      { error: "Failed to fetch bids" },
      { status: 500 }
    );
  }
}

// POST /api/bids - Create a new bid
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const { listingId, proposedFee } = body;

    // Validate required fields
    if (!listingId || !proposedFee) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if the listing exists
    const listing = await Listing.findOne({ listingId });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Check if the listing is still open
    if (listing.status !== ListingStatus.OPEN) {
      return NextResponse.json(
        { error: "Listing is not open for bids" },
        { status: 400 }
      );
    }

    // Check if the user is not the buyer
    if (listing.buyerId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot bid on your own listing" },
        { status: 400 }
      );
    }

    // Create a new bid
    const bid = await Bid.create({
      bidId: uuidv4(),
      travelerId: session.user.id,
      listingId: listing.listingId,
      proposedFee,
      status: BidStatus.PENDING,
      timestamp: new Date(),
    });

    return NextResponse.json({ bid }, { status: 201 });
  } catch (error) {
    console.error("Error creating bid:", error);
    return NextResponse.json(
      { error: "Failed to create bid" },
      { status: 500 }
    );
  }
}
