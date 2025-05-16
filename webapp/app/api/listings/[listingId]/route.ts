import { auth } from "@/lib/auth";
import { Listing, ListingStatus, User } from "@/models";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

// GET /api/listings/:listingId - Get a specific listing by its listingId
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

    const listing = await Listing.findOne({ listingId })
      .populate<{ buyerId: typeof User }>({
        path: "buyerId",
        select: "name username image rating telegramId",
      })
      .lean(); // Use lean for faster queries if not modifying

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({ listing });
  } catch (error) {
    console.error("Error fetching listing:", error);
    return NextResponse.json(
      { error: "Failed to fetch listing" },
      { status: 500 }
    );
  }
}

// PUT /api/listings/:listingId - Update a specific listing
export async function PUT(
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

    const body = await req.json();
    const {
      itemDescription,
      itemPrice,
      pickupLocation,
      destinationLocation,
      maxFee,
    } = body;

    const listing = await Listing.findOne({ listingId });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Ensure the user updating is the buyer and the listing is open
    if (listing.buyerId.toString() !== session.user.id.toString()) {
      return NextResponse.json(
        { error: "You are not authorized to update this listing" },
        { status: 403 }
      );
    }

    if (listing.status !== ListingStatus.OPEN) {
      return NextResponse.json(
        { error: "Only open listings can be updated" },
        { status: 400 }
      );
    }

    // Update fields if they are provided
    if (itemDescription !== undefined)
      listing.itemDescription = itemDescription;
    if (itemPrice !== undefined) listing.itemPrice = itemPrice;
    if (pickupLocation !== undefined) listing.pickupLocation = pickupLocation;
    if (destinationLocation !== undefined)
      listing.destinationLocation = destinationLocation;
    if (maxFee !== undefined) listing.maxFee = maxFee;

    const updatedListing = await listing.save();

    return NextResponse.json({ listing: updatedListing });
  } catch (error) {
    console.error("Error updating listing:", error);
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update listing" },
      { status: 500 }
    );
  }
}
