// webapp/components/matchmaking-drawer.tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../components/ui/drawer";
import { useMatchmaking, PopulatedBid } from "../contexts/matchmaking-context"; // Import PopulatedBid
import { micah } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import {
  Earth,
  CheckCircle,
  XCircle,
  Send,
  ShieldCheck,
  ShieldAlert,
  Info,
  Hourglass,
  Users,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton"; // For loading state

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
    pendingBids,
    listingMatchDetails,
    stopSearching,
    formatTime,
    acceptBid,
    declineBid,
    clearMatchDetails,
  } = useMatchmaking();

  const prevOpenRef = useRef(open);

  useEffect(() => {
    // Context now handles starting search when currentListing is set via startSearching(listing)
    prevOpenRef.current = open;

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("matchmaking-drawer-state-change", {
          detail: { isOpen: open },
        })
      );
    }
  }, [open]);

  const handleCancelOrClose = () => {
    if (listingMatchDetails?.isMatch) {
      clearMatchDetails();
    } else {
      stopSearching();
      onOpenChange(false);
    }
  };

  const getTravelerAvatar = (
    telegramId: number | string | undefined,
    name?: string
  ) => {
    const seed = telegramId
      ? telegramId.toString()
      : name || Math.random().toString();
    const avatar = createAvatar(micah, {
      seed: seed,
      size: 40, // Smaller avatar for list items
    });
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      avatar.toString()
    )}`;
  };

  const renderContent = () => {
    if (
      listingMatchDetails?.isMatch &&
      listingMatchDetails.listing &&
      listingMatchDetails.acceptedBid
    ) {
      const matchedListing = listingMatchDetails.listing;
      const acceptedBid = listingMatchDetails.acceptedBid;
      return (
        // Display Match Details
        <div className="space-y-4">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <CheckCircle className="text-green-500 h-6 w-6" /> Delivery
                Matched!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>
                <span className="font-medium">Item:</span>{" "}
                {matchedListing.itemDescription}
              </p>
              <p>
                <span className="font-medium">Accepted Fee:</span> $
                {acceptedBid.proposedFee.toFixed(2)}
              </p>
              <Separator />
              <p className="font-medium text-md">Traveller Info:</p>
              <div className="flex items-center gap-3 p-2 bg-muted rounded-md">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={getTravelerAvatar(
                      acceptedBid.travelerDetails?.telegramId,
                      acceptedBid.travelerDetails?.name
                    )}
                    alt="Traveller"
                  />
                  <AvatarFallback>
                    {acceptedBid.travelerDetails?.name
                      ?.charAt(0)
                      ?.toUpperCase() || "T"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-md">
                    {acceptedBid.travelerDetails?.name || "Traveller"}
                  </p>
                  {acceptedBid.travelerDetails?.username && (
                    <p className="text-xs text-muted-foreground">
                      @{acceptedBid.travelerDetails.username}
                    </p>
                  )}
                  <p className="text-xs">
                    Rating:{" "}
                    {acceptedBid.travelerDetails?.rating?.toFixed(1) || "N/A"} ★
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="font-medium text-md flex items-center gap-1.5">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  Your OTP:
                </p>
                <p className="text-muted-foreground text-xs">
                  Share this code with the traveller upon item pickup.
                </p>
                <p className="text-2xl font-bold tracking-wider bg-blue-50 p-3 rounded-lg text-blue-700 text-center">
                  {matchedListing.otpBuyer || "N/A"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-md flex items-center gap-1.5">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  Traveller's OTP:
                </p>
                <p className="text-muted-foreground text-xs">
                  The traveller will provide their OTP. Enter it in your
                  Telegram chat with the bot to confirm delivery and release
                  payment.
                </p>
              </div>
              <Button
                className="w-full mt-4 bg-sky-500 hover:bg-sky-600"
                onClick={() =>
                  window.open(
                    `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME}`,
                    "_blank"
                  )
                }
              >
                <Send className="mr-2 h-4 w-4" /> Open Telegram Chat
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (isSearching && currentListing) {
      return (
        <>
          {/* Item information card */}
          <Card className="mb-4 border-dashed">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-md font-semibold">
                Your Request:
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1 px-3 pb-3">
              <p className="truncate">
                <span className="font-medium">Item:</span>{" "}
                {currentListing.itemDescription}
              </p>
              <div className="flex justify-between">
                <p>
                  <span className="font-medium">Price:</span> $
                  {currentListing.itemPrice.toFixed(2)}
                </p>
                <p>
                  <span className="font-medium">Max Fee:</span> $
                  {currentListing.maxFee.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Timer with pulsing radar effect */}
          <div className="relative flex items-center justify-center my-4 w-28 h-28 mx-auto">
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
            <div className="z-10 p-3 relative bg-background/70 backdrop-blur-sm rounded-full">
              <div className="text-3xl font-semibold">
                {formatTime(elapsedTime)}
              </div>
            </div>
          </div>

          {/* Incoming Bids Section */}
          {pendingBids.length > 0 && (
            <div className="w-full space-y-2.5 mt-3">
              <h3 className="text-md font-semibold text-center mb-1.5 flex items-center justify-center gap-2">
                <Hourglass className="h-5 w-5 text-primary" /> Incoming Bids (
                {pendingBids.length})
              </h3>
              {pendingBids.map((bid) => (
                <Card
                  key={bid.bidId || bid._id.toString()}
                  className="bg-card shadow-sm border border-primary/30"
                >
                  <CardContent className="p-2.5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={getTravelerAvatar(
                              bid.travelerDetails?.telegramId,
                              bid.travelerDetails?.name
                            )}
                            alt="Traveller"
                          />
                          <AvatarFallback>
                            {bid.travelerDetails?.name
                              ?.charAt(0)
                              ?.toUpperCase() || "T"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm truncate max-w-[120px]">
                            {bid.travelerDetails?.name || "Traveller"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {bid.travelerDetails?.rating?.toFixed(1) || "N/A"} ★
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-sm border-primary text-primary py-1 px-2.5"
                      >
                        ${bid.proposedFee.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-500 hover:text-red-700"
                        onClick={() =>
                          declineBid(bid.bidId || bid._id.toString())
                        }
                      >
                        <XCircle className="mr-1.5 h-4 w-4" /> Decline
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white"
                        onClick={() =>
                          acceptBid(bid.bidId || bid._id.toString())
                        }
                      >
                        <CheckCircle className="mr-1.5 h-4 w-4" /> Accept
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Simulated Found Users (only if no bids yet) */}
          {pendingBids.length === 0 && (
            <div className="w-full space-y-1 mt-4 text-center">
              {foundUsers.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                    <Users className="h-4 w-4" /> Notifying {foundUsers.length}{" "}
                    potential traveller(s)...
                  </p>
                  <div className="flex flex-wrap justify-center gap-1 pt-1">
                    {foundUsers.slice(0, 5).map((user) => (
                      <Avatar
                        key={user.userId}
                        className="h-7 w-7 border-2 border-primary/20"
                      >
                        <AvatarImage
                          src={getTravelerAvatar(user.telegramId, user.name)}
                          alt="Traveller"
                        />
                        <AvatarFallback>
                          {user.name?.charAt(0)?.toUpperCase() || "T"}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {foundUsers.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{foundUsers.length - 5}
                      </Badge>
                    )}
                  </div>
                </>
              ) : elapsedTime > 5 ? ( // Show only if some time has passed
                <p className="text-sm text-muted-foreground">
                  Searching for travellers in your area...
                </p>
              ) : (
                <div className="py-4">
                  <Skeleton className="h-4 w-3/4 mx-auto mb-2" />
                  <Skeleton className="h-4 w-1/2 mx-auto" />
                </div>
              )}
            </div>
          )}

          {pendingBids.length === 0 &&
            foundUsers.length === 0 &&
            elapsedTime > 15 && (
              <div className="text-center py-6 text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Info className="h-5 w-5" />
                <p>
                  No travellers or bids yet. Please wait or consider adjusting
                  your request terms if no matches are found soon.
                </p>
              </div>
            )}
        </>
      );
    }

    // Default state if not searching or no current listing
    return (
      <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-3">
        <Info className="h-8 w-8 text-primary/50" />
        <p className="text-md">
          {currentListing
            ? "Search paused or completed."
            : "Create a new listing to start finding travellers."}
        </p>
        {!currentListing && (
          <p className="text-sm">Use the '+' button to request an item.</p>
        )}
      </div>
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col outline-none">
        <DrawerHeader className="text-center flex-shrink-0 pt-4 pb-2">
          <DrawerTitle className="text-xl">
            {listingMatchDetails?.isMatch
              ? "Match Found!"
              : "Finding Travellers"}
          </DrawerTitle>
          {currentListing && !listingMatchDetails?.isMatch && (
            <DrawerDescription className="text-xs">
              For:{" "}
              <span className="font-medium">
                {currentListing.itemDescription.length > 40
                  ? currentListing.itemDescription.substring(0, 37) + "..."
                  : currentListing.itemDescription}
              </span>
            </DrawerDescription>
          )}
          {listingMatchDetails?.isMatch && (
            <DrawerDescription className="text-sm">
              Your delivery request has been accepted.
            </DrawerDescription>
          )}
        </DrawerHeader>

        <div className="px-4 pb-1 flex-grow overflow-y-auto">
          {renderContent()}
        </div>

        <DrawerFooter className="pt-3 pb-4 flex-shrink-0">
          <Button
            variant={listingMatchDetails?.isMatch ? "outline" : "destructive"}
            onClick={handleCancelOrClose}
            className="w-full"
          >
            {listingMatchDetails?.isMatch ? "Close" : "Cancel Search"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
