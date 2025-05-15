import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  // We don't need any client-side plugins for Telegram auth
  // since it's handled by the server-side callback
  // Add cookie options to ensure cookies work correctly with Cloudflare Tunnel
  cookieOptions: {
    // These settings are important for Cloudflare Tunnel
    secure: true,
    sameSite: "none", // Allow cross-site cookies when using Cloudflare Tunnel
    path: "/",
    domain: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://otw.jiawei.dev")
      .hostname,
  },
});

export const { signIn, signOut, useSession } = authClient;
