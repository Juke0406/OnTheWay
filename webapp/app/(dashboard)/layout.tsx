"use client";

import { ListingForm } from "@/components/listing-form";
import { MatchmakingDrawer } from "@/components/matchmaking-drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MatchmakingProvider } from "@/contexts/matchmaking-context";
import { signOut, useSession } from "@/lib/auth-client";
import { micah } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { ClipboardList, LogOut, Package, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [deliverDialogOpen, setDeliverDialogOpen] = useState(false);
  const [matchmakingOpen, setMatchmakingOpen] = useState(false);

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

  const handleSignOut = () => {
    signOut().then(() => router.push("/login"));
  };

  return (
    <MatchmakingProvider onOpenDrawer={() => setMatchmakingOpen(true)}>
      <div className="h-screen w-screen overflow-hidden relative">
        {/* Sonner Toast Provider */}
        <Toaster position="top-right" closeButton richColors />

        {/* Main content area - Map will be the full screen content */}
        <main className="absolute inset-0">{children}</main>

        {/* Bottom Navigation Bar - Floating over the map */}
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-background/80 backdrop-blur-sm border rounded-full px-2 py-1 shadow-lg">
          <div className="flex justify-between items-center gap-2">
            {/* Dashboard Button */}
            <Drawer open={dashboardOpen} onOpenChange={setDashboardOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-12 w-12 flex items-center justify-center"
                >
                  <ClipboardList className="h-6 w-6" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Dashboard</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-4">
                  {/* Dashboard content will be injected here */}
                  <iframe
                    src="/dashboard"
                    className="w-full h-[70vh] border-none"
                    title="Dashboard"
                  />
                </div>
              </DrawerContent>
            </Drawer>

            {/* List Something Button */}
            <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-12 w-12 flex items-center justify-center"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>List Something</DialogTitle>
                  <DialogDescription>
                    Create a new listing for something you need delivered.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <ListingForm
                    onClose={() => setListDialogOpen(false)}
                    onSubmitSuccess={() => setMatchmakingOpen(true)}
                  />
                </div>
              </DialogContent>
            </Dialog>

            {/* Deliver Things Button */}
            <Dialog
              open={deliverDialogOpen}
              onOpenChange={setDeliverDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-12 w-12 flex items-center justify-center"
                >
                  <Package className="h-6 w-6" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Deliver Things</DialogTitle>
                  <DialogDescription>
                    Start delivering items to earn money.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="mb-4">
                    To start delivering, you need to share your live location
                    with our Telegram bot.
                  </p>
                  <Button asChild className="w-full">
                    <Link
                      href="https://t.me/onthewaysupportbot"
                      target="_blank"
                    >
                      Open Telegram Bot
                    </Link>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Matchmaking Drawer */}
            <MatchmakingDrawer
              open={matchmakingOpen}
              onOpenChange={setMatchmakingOpen}
            />

            {/* User Profile Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-12 w-12 flex items-center justify-center"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={userData.avatarSvg}
                      alt={userData.userName}
                    />
                    <AvatarFallback>{userData.userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
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
        </div>
      </div>
    </MatchmakingProvider>
  );
}
