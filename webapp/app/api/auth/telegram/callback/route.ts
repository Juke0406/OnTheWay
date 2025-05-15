import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

// Configure this route to use the Node.js runtime instead of Edge
export const runtime = 'nodejs';

// This route handles the Telegram authentication callback
export async function GET(req: NextRequest) {
  console.log("Telegram callback route called");
  
  // Forward the request to the auth handler
  return auth.handler(req);
}
