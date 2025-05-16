// webapp/contexts/matchmaking-context.tsx
"use client";

import { Earth } from "lucide-react";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { toast } from "sonner";
import {
  IBid,
  IListing,
  IUser,
  ListingStatus,
  BidStatus,
} from "../models/types";
import { getDistanceInKm } from "../lib/geo-utils";

// ... (keep existing interfaces: AvailableUser, MatchmakingListing)

interface AvailableUser {
  userId: string;
  telegramId?: number;
  rating: number;
  name?: string;
  username?: string;
  image?: string;
  availabilityData: {
    location: {
      latitude: number;
      longitude: number;
    };
    isLiveLocation?: boolean;
    radius?: number;
  };
}

export interface MatchmakingListing {
  // Export for use in ListingForm
  listingId?: string;
  itemDescription: string;
  itemPrice: number;
  maxFee: number;
  pickupAddress: string;
  deliveryAddress: string;
  pickupCoordinates: { lat: number; lng: number };
  deliveryCoordinates: { lat: number; lng: number };
  status?: ListingStatus; // Add status
  otpBuyer?: string;
  otpTraveler?: string;
}

// Augment IBid to include traveler details for UI
export interface PopulatedBid extends IBid {
  // Export for use elsewhere if needed
  travelerDetails?: Partial<IUser>;
}

interface MatchmakingContextType {
  isSearching: boolean;
  elapsedTime: number;
  foundUsers: AvailableUser[];
  currentListing: MatchmakingListing | null;
  pendingBids: PopulatedBid[];
  listingMatchDetails: {
    listing?: IListing | MatchmakingListing; // Allow both types
    acceptedBid?: PopulatedBid;
    isMatch: boolean;
  } | null;
  startSearching: (listingDetails: MatchmakingListing) => void;
  stopSearching: () => void;
  formatTime: (seconds: number) => string;
  openMatchmakingDrawer: () => void;
  setCurrentListing: (listing: MatchmakingListing | null) => void;
  acceptBid: (bidId: string) => Promise<void>;
  declineBid: (bidId: string) => Promise<void>;
  clearMatchDetails: () => void;
}

// ... (keep MatchmakingContext definition)
const MatchmakingContext = createContext<MatchmakingContextType | undefined>(
  undefined
);

export function useMatchmaking() {
  const context = useContext(MatchmakingContext);
  if (context === undefined) {
    throw new Error("useMatchmaking must be used within a MatchmakingProvider");
  }
  return context;
}

interface MatchmakingProviderProps {
  children: ReactNode;
  onOpenDrawer: () => void;
}

export function MatchmakingProvider({
  children,
  onOpenDrawer,
}: MatchmakingProviderProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [foundUsers, setFoundUsers] = useState<AvailableUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [toastId, setToastId] = useState<string | number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentListing, setCurrentListingInternal] = // Renamed to avoid conflict
    useState<MatchmakingListing | null>(null);

  const [pendingBids, setPendingBids] = useState<PopulatedBid[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [listingMatchDetails, setListingMatchDetails] = useState<{
    listing?: IListing | MatchmakingListing;
    acceptedBid?: PopulatedBid;
    isMatch: boolean;
  } | null>(null);

  const setCurrentListing = useCallback(
    (listing: MatchmakingListing | null) => {
      setCurrentListingInternal(listing);
      if (!listing) {
        // If clearing listing, also clear match details
        setListingMatchDetails(null);
        setIsSearching(false); // Stop searching if listing is cleared
      }
    },
    []
  );

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSearching) {
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSearching]);

  const fetchBidsForCurrentListing = useCallback(async () => {
    if (
      !currentListing ||
      !currentListing.listingId ||
      listingMatchDetails?.isMatch
    ) {
      setPendingBids([]);
      return;
    }
    try {
      const response = await fetch(
        `/api/listings/${currentListing.listingId}/bids`
      );
      if (!response.ok) {
        // console.warn("Failed to fetch bids:", response.statusText);
        setPendingBids([]); // Clear bids on failure or if listing not found
        return;
      }
      const data = await response.json();

      if (data.bids && Array.isArray(data.bids)) {
        const newPendingBids = data.bids.filter(
          (bid: IBid) => bid.status === BidStatus.PENDING
        );

        // Check if new bids are different from existing ones to prevent unnecessary re-renders
        if (JSON.stringify(newPendingBids) !== JSON.stringify(pendingBids)) {
          setPendingBids(newPendingBids);
          if (
            newPendingBids.length > pendingBids.length &&
            newPendingBids.length > 0 &&
            drawerOpen
          ) {
            toast.info(
              `New bid(s) received for ${currentListing.itemDescription}!`
            );
          }
        }
      } else {
        setPendingBids([]);
      }
    } catch (error) {
      // console.warn("Error fetching bids:", error);
      setPendingBids([]);
    }
  }, [currentListing, listingMatchDetails?.isMatch, drawerOpen]); // Removed pendingBids from dependencies

  useEffect(() => {
    if (
      isSearching &&
      currentListing &&
      currentListing.listingId &&
      !listingMatchDetails?.isMatch
    ) {
      fetchBidsForCurrentListing();
      pollingIntervalRef.current = setInterval(
        fetchBidsForCurrentListing,
        1000
      );
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (!listingMatchDetails?.isMatch) {
        // Don't clear pending bids if it's a match
        setPendingBids([]);
      }
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [
    isSearching,
    currentListing,
    fetchBidsForCurrentListing,
    listingMatchDetails?.isMatch,
  ]);

  useEffect(() => {
    const fetchInitialAvailableUsers = async () => {
      if (isSearching && currentListing) {
        try {
          const response = await fetch("/api/users/available");
          const data = await response.json();
          if (data.users) {
            const { lat: pickupLat, lng: pickupLng } =
              currentListing.pickupCoordinates;
            const nearbyUsers = data.users.filter((user: AvailableUser) => {
              if (!user.availabilityData?.location) return false;
              const distance = getDistanceInKm(
                pickupLat,
                pickupLng,
                user.availabilityData.location.latitude,
                user.availabilityData.location.longitude
              );
              const userSearchRadius = user.availabilityData.radius || 50;
              return distance <= userSearchRadius;
            });
            setAvailableUsers(nearbyUsers);
          }
        } catch (error) {
          console.error("Error fetching available users:", error);
        }
      } else {
        setAvailableUsers([]);
      }
    };
    fetchInitialAvailableUsers();
  }, [isSearching, currentListing]);

  useEffect(() => {
    if (isSearching && availableUsers.length > 0) {
      const interval = setInterval(() => {
        const remainingUsers = availableUsers.filter(
          (user) => !foundUsers.some((found) => found.userId === user.userId)
        );
        if (remainingUsers.length > 0) {
          const randomIndex = Math.floor(Math.random() * remainingUsers.length);
          const newUser = remainingUsers[randomIndex];
          setFoundUsers((prev) => [...prev, newUser]);
        } else {
          clearInterval(interval);
        }
      }, 5000 + Math.random() * 5000);
      return () => clearInterval(interval);
    }
  }, [isSearching, availableUsers, foundUsers]);

  useEffect(() => {
    const handleDrawerStateChange = (event: CustomEvent) => {
      setDrawerOpen(event.detail.isOpen);
    };
    window.addEventListener(
      "matchmaking-drawer-state-change",
      handleDrawerStateChange as EventListener
    );
    return () => {
      window.removeEventListener(
        "matchmaking-drawer-state-change",
        handleDrawerStateChange as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (!drawerOpen && isSearching && !listingMatchDetails?.isMatch) {
      const id = toast.custom(
        () => (
          <div
            className="bg-background border border-primary/20 rounded-lg p-4 shadow-lg cursor-pointer flex items-center gap-3"
            onClick={() => {
              onOpenDrawer();
              setDrawerOpen(true);
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Earth className="absolute text-primary/10 w-10 h-10" />
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
              <div className="relative bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center">
                <span className="text-xs font-medium">
                  {formatTime(elapsedTime)}
                </span>
              </div>
            </div>
            <div>
              <div className="font-medium">
                {pendingBids.length > 0
                  ? `${pendingBids.length} New Bid(s)!`
                  : "Finding Travellers"}
              </div>
              <div className="text-sm text-muted-foreground">
                {pendingBids.length > 0 && currentListing
                  ? `For: ${currentListing.itemDescription.substring(0, 20)}...`
                  : `Found ${foundUsers.length} traveller${
                      foundUsers.length !== 1 ? "s" : ""
                    }`}
              </div>
            </div>
          </div>
        ),
        {
          id: "matchmaking-toast",
          duration: Infinity,
        }
      );
      setToastId(id);
    } else if (toastId && (drawerOpen || listingMatchDetails?.isMatch)) {
      toast.dismiss(toastId);
      setToastId(null);
    }
    return () => {
      if (toastId) {
        toast.dismiss(toastId);
      }
    };
  }, [
    drawerOpen,
    isSearching,
    elapsedTime,
    foundUsers.length,
    pendingBids.length,
    onOpenDrawer,
    toastId,
    listingMatchDetails?.isMatch,
    // Removed currentListing from dependencies and use specific properties instead
    currentListing?.itemDescription,
  ]);

  const startSearching = (listingDetails: MatchmakingListing) => {
    if (!listingDetails.listingId) {
      console.error("Cannot start searching without a listingId.");
      toast.error("Error: Listing details are incomplete for matchmaking.");
      return;
    }
    setCurrentListing(listingDetails); // Use the callback version
    setIsSearching(true);
    setElapsedTime(0);
    setFoundUsers([]);
    setPendingBids([]);
    setListingMatchDetails(null);
    onOpenDrawer();
    setDrawerOpen(true);
  };

  const stopSearching = () => {
    setIsSearching(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (toastId) {
      toast.dismiss(toastId);
      setToastId(null);
    }
    // Do not clear currentListing, pendingBids, or foundUsers here
    // to allow viewing them if the drawer is simply closed then reopened.
    // They will be cleared/reset when a new search starts or clearMatchDetails is called.
  };

  const openMatchmakingDrawer = () => {
    onOpenDrawer();
    setDrawerOpen(true);
  };

  const acceptBid = async (bidId: string) => {
    if (!currentListing || !currentListing.listingId) {
      toast.error("No active listing to accept a bid for.");
      return;
    }
    try {
      const response = await fetch(`/api/bids/${bidId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: currentListing.listingId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to accept bid");
      }
      const result = await response.json();
      toast.success(result.message || "Bid accepted successfully!");

      const acceptedBidDetails = pendingBids.find(
        (b) => (b.bidId || b._id.toString()) === bidId
      );

      const listingResponse = await fetch(
        `/api/listings/${currentListing.listingId}`
      );
      if (listingResponse.ok) {
        const updatedListingData = await listingResponse.json();
        setListingMatchDetails({
          listing: updatedListingData.listing as IListing,
          acceptedBid: acceptedBidDetails,
          isMatch: true,
        });
        setCurrentListing(updatedListingData.listing as MatchmakingListing); // Update currentListing with OTPs etc.
      } else {
        setListingMatchDetails({
          listing: {
            ...currentListing,
            status: ListingStatus.MATCHED,
            otpBuyer: result.otpBuyer,
            otpTraveler: result.otpTraveler,
          } as MatchmakingListing,
          acceptedBid: acceptedBidDetails,
          isMatch: true,
        });
        // Use the callback version to avoid stale closures
        setCurrentListing({
          ...currentListing,
          status: ListingStatus.MATCHED,
          otpBuyer: result.otpBuyer,
          otpTraveler: result.otpTraveler,
        });
      }

      setIsSearching(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setPendingBids([]);
    } catch (error) {
      console.error("Error accepting bid:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not accept bid."
      );
    }
  };

  const declineBid = async (bidId: string) => {
    try {
      const response = await fetch(`/api/bids/${bidId}/decline`, {
        method: "POST",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to decline bid");
      }
      const result = await response.json();
      toast.success(result.message || "Bid declined.");
      setPendingBids((prevBids) =>
        prevBids.filter((b) => (b.bidId || b._id.toString()) !== bidId)
      );
    } catch (error) {
      console.error("Error declining bid:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not decline bid."
      );
    }
  };

  const clearMatchDetails = () => {
    setListingMatchDetails(null);
    setCurrentListing(null);
    setIsSearching(false); // Ensure searching stops
    setPendingBids([]);
    setFoundUsers([]);
    setElapsedTime(0);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    // onOpenChange(false); // This should be handled by the component using the drawer
  };

  const value = {
    isSearching,
    elapsedTime,
    foundUsers,
    currentListing,
    pendingBids,
    listingMatchDetails,
    startSearching,
    stopSearching,
    formatTime,
    openMatchmakingDrawer,
    setCurrentListing,
    acceptBid,
    declineBid,
    clearMatchDetails,
  };

  return (
    <MatchmakingContext.Provider value={value}>
      {children}
    </MatchmakingContext.Provider>
  );
}
