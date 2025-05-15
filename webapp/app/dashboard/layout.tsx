"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth-client";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect in the useEffect
  }

  // Log session data to see structure
  console.log("Session data:", session);

  // Get user info from session
  const userImage = session?.user?.image || "";
  const userName = session?.user?.name || "User";
  const userInitials = userName.charAt(0).toUpperCase();

  // For Telegram users, we might have additional data
  // We'll check if it exists in the session object
  const telegramId = (session?.user as any)?.telegramId;
  const username = (session?.user as any)?.username;
  const walletBalance = (session?.user as any)?.walletBalance || 0;
  const rating = (session?.user as any)?.rating || 0;

  const handleSignOut = () => {
    signOut().then(() => router.push("/login"));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-background backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/dashboard" className="font-semibold">
            On the Way
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <div className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground rounded-md p-2 transition-colors">
                <Avatar>
                  <AvatarImage src={userImage} alt={userName} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block font-medium">
                  {userName}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{userName}</span>
                  {username && (
                    <span className="text-xs text-muted-foreground">
                      @{username}
                    </span>
                  )}
                  {telegramId && !username && (
                    <span className="text-xs text-muted-foreground">
                      Telegram ID: {telegramId}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-default">
                <div className="flex justify-between w-full">
                  <span>Wallet Balance</span>
                  <span className="font-medium flex items-center">
                    ${walletBalance.toFixed(2)}
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-default">
                <div className="flex justify-between w-full">
                  <span>Rating</span>
                  <span className="font-medium flex items-center">
                    {rating.toFixed(1)}{" "}
                    <span className="text-yellow-500 ml-1">★</span>
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
