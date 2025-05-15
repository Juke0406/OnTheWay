import { auth } from "@/lib/auth";
import { Listing, ListingStatus } from "@/models";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// GET /api/listings - Get all listings
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const listings = await Listing.find({
      buyerId: session.user.id,
    });

    return NextResponse.json({ listings });
  } catch (error) {
    console.error("Error fetching listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

// POST /api/listings - Create a new listing
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      itemDescription,
      itemPrice,
      pickupLocation,
      destinationLocation,
      maxFee,
    } = body;

    // Validate required fields
    if (
      !itemDescription ||
      !itemPrice ||
      !pickupLocation ||
      !destinationLocation ||
      !maxFee
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create a new listing
    const listing = await Listing.create({
      listingId: uuidv4(),
      buyerId: session.user.id,
      itemDescription,
      itemPrice,
      pickupLocation,
      destinationLocation,
      maxFee,
      status: ListingStatus.OPEN,
      deliveryConfirmed: false,
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error("Error creating listing:", error);
    return NextResponse.json(
      { error: "Failed to create listing" },
      { status: 500 }
    );
  }
}
