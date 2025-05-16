"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMatchmaking } from "@/contexts/matchmaking-context";
import { micah } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { Earth } from "lucide-react";
import { useEffect, useRef } from "react";

interface MatchmakingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatchmakingDrawer({
  open,
  onOpenChange,
}: MatchmakingDrawerProps) {
  const {
    isSearching,
    elapsedTime,
    foundUsers,
    currentListing,
    startSearching,
    stopSearching,
    formatTime,
  } = useMatchmaking();

  // Use a ref to track previous open state to avoid unnecessary effects
  const prevOpenRef = useRef(open);

  // Start searching when drawer opens
  useEffect(() => {
    // Only start searching if the drawer was previously closed and is now open
    if (open && !prevOpenRef.current) {
      startSearching();
    }

    // Update the ref with current open state
    prevOpenRef.current = open;

    // Notify the context about drawer state via a custom event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("matchmaking-drawer-state-change", {
          detail: { isOpen: open },
        })
      );
    }
  }, [open, startSearching]);

  // Handle cancel button
  const handleCancel = () => {
    stopSearching();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto">
        <DrawerHeader className="text-center">
          <DrawerTitle>Finding Travellers</DrawerTitle>
          <DrawerDescription>
            Searching for available travellers in your area...
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 flex flex-col items-center">
          {/* Item information */}
          {currentListing && (
            <div className="w-full mb-6 p-4 border border-border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Item Information</h3>
              <div className="space-y-2">
                <div>
                  <div className="text-sm font-medium">Description</div>
                  <div className="text-sm text-muted-foreground">
                    {currentListing.itemDescription}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-sm font-medium">Item Price</div>
                    <div className="text-sm text-muted-foreground">
                      ${currentListing.itemPrice.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Max Fee</div>
                    <div className="text-sm text-muted-foreground">
                      ${currentListing.maxFee.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Pickup Location</div>
                  <div className="text-sm text-muted-foreground">
                    {currentListing.pickupAddress}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Delivery Location</div>
                  <div className="text-sm text-muted-foreground">
                    {currentListing.deliveryAddress}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timer with pulsing radar effect */}
          <div
            className="relative flex items-center justify-center my-6"
            style={{ width: "140px", height: "140px", margin: "0 auto" }}
          >
            <Earth
              className="absolute text-muted-foreground/5 w-[80rem] h-[80rem]"
              strokeWidth={0.5}
            />
            <div className="matchmaking-pulse-container">
              {[1, 2, 3].map((i) => (
                <div
                  key={`pulse-ring-${i}`}
                  className="matchmaking-pulse-ring"
                  style={{
                    animation: `matchmaking-pulse 2.5s infinite ${
                      i * 0.6
                    }s cubic-bezier(0, 0, 0.2, 1)`,
                  }}
                />
              ))}
            </div>
            <div className="z-10 p-4" style={{ position: "relative" }}>
              <div className="text-4xl font-semibold">
                {formatTime(elapsedTime)}
              </div>
            </div>
          </div>

          {/* Found users */}
          <div className="w-full space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Found Travellers ({foundUsers.length})
              </h3>
              <div className="text-sm text-muted-foreground">
                {isSearching ? "Searching..." : "Search complete"}
              </div>
            </div>

            <div className="space-y-2">
              {foundUsers.map((user) => {
                // Generate avatar using telegramId as seed
                const avatar = createAvatar(micah, {
                  seed: user.telegramId?.toString() || user.userId,
                  size: 128,
                });

                const avatarSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                  avatar.toString()
                )}`;

                return (
                  <div
                    key={user.userId}
                    className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg"
                  >
                    <Avatar>
                      <AvatarImage src={avatarSvg} alt="Traveller" />
                      <AvatarFallback>T</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div className="font-medium">Traveller</div>
                        <div className="text-sm text-muted-foreground">
                          {user.rating.toFixed(1)} ★
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.availabilityData.radius
                          ? `${user.availabilityData.radius}km radius`
                          : "Available for delivery"}
                      </div>
                    </div>
                  </div>
                );
              })}

              {foundUsers.length === 0 && isSearching && (
                <div className="text-center py-8 text-muted-foreground">
                  Searching for travellers...
                </div>
              )}
            </div>
          </div>
        </div>

        <DrawerFooter className="flex justify-center">
          <Button
            variant="destructive"
            onClick={handleCancel}
            className="w-full"
          >
            Cancel Search
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
