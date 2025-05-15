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
import { micah } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { LogOut, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // All hooks must be called before any conditional returns
  const userData = useMemo(() => {
    if (!session?.user) {
      return {
        userName: "User",
        userInitials: "U",
        telegramId: undefined,
        username: undefined,
        walletBalance: 0,
        rating: 0,
        avatarSvg: "",
      };
    }

    const userName = session.user.name || "User";
    const userInitials = userName.charAt(0).toUpperCase();
    const telegramId = (session.user as any)?.telegramId;
    const username = (session.user as any)?.username;
    const walletBalance = (session.user as any)?.walletBalance || 0;
    const rating = (session.user as any)?.rating || 0;

    // Generate avatar using telegramId as seed
    let avatarSvg = session.user.image || "";
    if (telegramId) {
      const avatar = createAvatar(micah, {
        seed: telegramId.toString(),
        size: 128,
      });
      avatarSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
        avatar.toString()
      )}`;
    }

    return {
      userName,
      userInitials,
      telegramId,
      username,
      walletBalance,
      rating,
      avatarSvg,
    };
  }, [session?.user]);

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

  const handleSignOut = () => {
    signOut().then(() => router.push("/login"));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-background backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-semibold">
              On the Way
            </Link>
            <Link
              href="/map"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MapPin className="h-4 w-4" />
              <span>Map</span>
            </Link>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <div className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground rounded-md p-2 transition-colors">
                <Avatar>
                  <AvatarImage
                    src={userData.avatarSvg}
                    alt={userData.userName}
                  />
                  <AvatarFallback>{userData.userInitials}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block font-medium">
                  {userData.userName}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{userData.userName}</span>
                  {userData.username && (
                    <span className="text-xs text-muted-foreground">
                      @{userData.username}
                    </span>
                  )}
                  {userData.telegramId && !userData.username && (
                    <span className="text-xs text-muted-foreground">
                      Telegram ID: {userData.telegramId}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-default">
                <div className="flex justify-between w-full">
                  <span>Wallet Balance</span>
                  <span className="font-medium flex items-center">
                    ${userData.walletBalance.toFixed(2)}
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-default">
                <div className="flex justify-between w-full">
                  <span>Rating</span>
                  <span className="font-medium flex items-center">
                    {userData.rating.toFixed(1)}{" "}
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
