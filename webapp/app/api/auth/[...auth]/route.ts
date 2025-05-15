import { auth } from "@/lib/auth";

// Configure this route to use the Node.js runtime instead of Edge
export const runtime = "nodejs";

export const GET = auth.handler;
export const POST = auth.handler;
export const PUT = auth.handler;
export const DELETE = auth.handler;
export const PATCH = auth.handler;
