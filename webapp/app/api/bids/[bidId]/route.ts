import { auth } from "@/lib/auth";
import { Bid, BidStatus, Listing, ListingStatus } from "@/models";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

// GET /api/bids/:bidId - Get a specific bid by its bidId
export async function GET(
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

    const bid = await Bid.findOne({ bidId }).populate("travelerId listingId"); // Populate as needed

    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    // Authorization: User must be the traveler who made the bid or the buyer of the listing
    const listing = bid.listingId as any; // Assuming populated
    if (
      bid.travelerId.toString() !== session.user.id.toString() &&
      listing.buyerId.toString() !== session.user.id.toString()
    ) {
      return NextResponse.json(
        { error: "You are not authorized to view this bid" },
        { status: 403 }
      );
    }

    return NextResponse.json({ bid });
  } catch (error) {
    console.error("Error fetching bid:", error);
    return NextResponse.json({ error: "Failed to fetch bid" }, { status: 500 });
  }
}

// PUT /api/bids/:bidId - Update a specific bid (e.g., traveler updates proposedFee)
export async function PUT(
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

    const body = await req.json();
    const { proposedFee } = body;

    if (
      proposedFee === undefined ||
      typeof proposedFee !== "number" ||
      proposedFee < 0
    ) {
      return NextResponse.json(
        { error: "Valid proposedFee is required" },
        { status: 400 }
      );
    }

    const bid = await Bid.findOne({ bidId }).populate("listingId");

    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    if (bid.travelerId.toString() !== session.user.id.toString()) {
      return NextResponse.json(
        { error: "You are not authorized to update this bid" },
        { status: 403 }
      );
    }

    if (bid.status !== BidStatus.PENDING) {
      return NextResponse.json(
        { error: "Only pending bids can be updated" },
        { status: 400 }
      );
    }

    const listing = bid.listingId as any; // Type assertion after population
    if (!listing || listing.status !== ListingStatus.OPEN) {
      return NextResponse.json(
        { error: "Bids can only be updated for open listings" },
        { status: 400 }
      );
    }

    bid.proposedFee = proposedFee;
    bid.timestamp = new Date(); // Update timestamp
    const updatedBid = await bid.save();

    return NextResponse.json({ bid: updatedBid });
  } catch (error) {
    console.error("Error updating bid:", error);
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update bid" },
      { status: 500 }
    );
  }
}
