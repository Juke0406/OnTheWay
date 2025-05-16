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

    // Get telegramId from session
    const telegramId = (session.user as any)?.telegramId;

    if (!telegramId) {
      return NextResponse.json(
        { error: "Telegram ID not found in session" },
        { status: 400 }
      );
    }

    const listings = await Listing.find({
      buyerId: telegramId,
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

    // Get telegramId from session
    const telegramId = (session.user as any)?.telegramId;

    if (!telegramId) {
      return NextResponse.json(
        { error: "Telegram ID not found in session" },
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

    // Extract location data - now already in bot format
    const formattedPickupLocation = {
      latitude: pickupLocation.latitude || 0,
      longitude: pickupLocation.longitude || 0,
    };

    const formattedDestinationLocation = {
      latitude: destinationLocation.latitude || 0,
      longitude: destinationLocation.longitude || 0,
    };

    // Create a new listing
    const listing = await Listing.create({
      buyerId: telegramId, // Use telegramId instead of session.user.id
      itemDescription,
      itemPrice,
      pickupLocation: formattedPickupLocation,
      destinationLocation: formattedDestinationLocation,
      maxFee,
      status: ListingStatus.OPEN,
      buyerConfirmed: false,
      travelerConfirmed: false,
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
