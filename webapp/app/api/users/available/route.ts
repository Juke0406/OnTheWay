import { auth } from "@/lib/auth";
import { User } from "@/models";
import { NextRequest, NextResponse } from "next/server";

// GET /api/users/available - Get all available deliverers
export async function GET(req: NextRequest) {
  try {
    // Create a simple request object with just the headers
    const session = await auth.api.getSession(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find users who are available for deliveries
    const availableUsers = await User.find({
      "availabilityData.isAvailable": true,
      "availabilityData.location": { $exists: true },
    }).select(
      "userId username name image rating availabilityData.location availabilityData.isLiveLocation availabilityData.radius"
    );

    return NextResponse.json({ users: availableUsers });
  } catch (error) {
    console.error("Error fetching available users:", error);
    return NextResponse.json(
      { error: "Failed to fetch available users" },
      { status: 500 }
    );
  }
}
