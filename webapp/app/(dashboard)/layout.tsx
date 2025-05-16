"use client";

import { DashboardContent } from "@/components/dashboard-content";
import { ListingForm } from "@/components/listing-form";
import { MatchmakingDrawer } from "@/components/matchmaking-drawer";
import { SettingsModal } from "@/components/settings-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from "@/components/ui/credenza";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
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
import { isValidImage } from "@/lib/image-utils";
import { setupPlacesAutocompleteClickHandler } from "@/lib/prevent-dialog-close";
import { micah } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import {
  Globe,
  LogOut,
  Navigation,
  Package,
  Plus,
  Settings,
} from "lucide-react";
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
  const [listCredenzaOpen, setListCredenzaOpen] = useState(false);
  const [deliverCredenzaOpen, setDeliverCredenzaOpen] = useState(false);
  const [matchmakingOpen, setMatchmakingOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // All hooks must be called before any conditional returns
  // State to track if the Telegram avatar is valid
  const [isTelegramAvatarValid, setIsTelegramAvatarValid] = useState<
    boolean | null
  >(null);

  // Check if the Telegram avatar is valid when the session changes
  useEffect(() => {
    const checkTelegramAvatar = async () => {
      if (session?.user?.image) {
        const isValid = await isValidImage(session.user.image);
        setIsTelegramAvatarValid(isValid);
      } else {
        setIsTelegramAvatarValid(false);
      }
    };

    checkTelegramAvatar();
  }, [session?.user?.image]);

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

    // Generate avatar using telegramId as seed for fallback
    let avatarSvg = "";

    // Use Telegram avatar if available and valid
    if (session.user.image && isTelegramAvatarValid) {
      avatarSvg = session.user.image;
    }
    // Otherwise generate avatar using telegramId as seed
    else if (telegramId) {
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
  }, [session?.user, isTelegramAvatarValid]);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  // Set up the Places Autocomplete click handler to prevent dialog from closing
  useEffect(() => {
    const cleanup = setupPlacesAutocompleteClickHandler();
    return cleanup;
  }, []);

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
                  <Globe className="h-6 w-6" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="px-4 py-4">
                  <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
                  {/* Dashboard content directly included */}
                  <DashboardContent />
                </div>
              </DrawerContent>
            </Drawer>

            {/* List Something Button */}
            <Credenza
              open={listCredenzaOpen}
              onOpenChange={setListCredenzaOpen}
            >
              <CredenzaTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-12 w-12 flex items-center justify-center"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </CredenzaTrigger>
              <CredenzaContent>
                <CredenzaHeader>
                  <CredenzaTitle>Request an Item</CredenzaTitle>
                  <CredenzaDescription>
                    Create a new listing for something you need delivered.
                  </CredenzaDescription>
                </CredenzaHeader>
                <div className="py-4">
                  <ListingForm
                    onClose={() => setListCredenzaOpen(false)}
                    onSubmitSuccess={() => setMatchmakingOpen(true)}
                  />
                </div>
              </CredenzaContent>
            </Credenza>

            {/* Deliver Things Button */}
            <Credenza
              open={deliverCredenzaOpen}
              onOpenChange={setDeliverCredenzaOpen}
            >
              <CredenzaTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-12 w-12 flex items-center justify-center"
                >
                  <Package className="h-6 w-6" />
                </Button>
              </CredenzaTrigger>
              <CredenzaContent>
                <CredenzaHeader>
                  <CredenzaTitle>Earn & Deliver</CredenzaTitle>
                  <CredenzaDescription>
                    Start helping others deliver items they need & earn money on
                    your way.
                  </CredenzaDescription>
                </CredenzaHeader>
                <div className="py-4 gap-4 flex flex-col items-center">
                  <Navigation className="text-blue-400" size={50} />
                  <p className="mb-4 text-muted-foreground text-center">
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
              </CredenzaContent>
            </Credenza>

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
                <DropdownMenuItem asChild>
                  <button
                    className="flex w-full items-center"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings Modal */}
            <SettingsModal
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              walletBalance={userData.walletBalance}
            >
              <span></span>
            </SettingsModal>
          </div>
        </div>
      </div>
    </MatchmakingProvider>
  );
}
