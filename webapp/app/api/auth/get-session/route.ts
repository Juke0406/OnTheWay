import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// This route handles GET requests to /api/auth/get-session
// It's used by the client-side useSession hook to check authentication status
// Configure this route to use the Node.js runtime instead of Edge
export const runtime = "nodejs";

// Configure CORS headers to allow cross-domain requests
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
  "Access-Control-Allow-Credentials": "true",
};

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
export async function GET(req: NextRequest) {
  try {
    // Create a standard Request object from the NextRequest
    const request = new Request(req.url, {
      headers: req.headers,
      method: req.method,
    });

    // Get the session using the auth handler
    const session = await auth.api.getSession(request);

    // Create response with session data
    const response = NextResponse.json(session || null);

    // Add CORS headers to the response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error("Error in get-session route:", error);

    // Create error response
    const response = NextResponse.json(null, { status: 500 });

    // Add CORS headers to the error response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
}
