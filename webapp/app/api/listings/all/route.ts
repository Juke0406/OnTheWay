import { auth } from "@/lib/auth";
import { Listing, ListingStatus } from "@/models";
import { NextRequest, NextResponse } from "next/server";

// GET /api/listings/all - Get all available listings
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all open listings
    const listings = await Listing.find({
      status: ListingStatus.OPEN,
    });

    return NextResponse.json({ listings });
  } catch (error) {
    console.error("Error fetching all listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}
