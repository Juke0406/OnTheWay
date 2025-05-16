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
  const [currentListing, setCurrentListingInternal] =
    useState<MatchmakingListing | null>(null);

  const [pendingBids, setPendingBids] = useState<PopulatedBid[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [listingMatchDetails, setListingMatchDetails] = useState<{
    listing?: IListing | MatchmakingListing;
    acceptedBid?: PopulatedBid;
    isMatch: boolean;
  } | null>(null);

  const prevPendingBidsCountRef = useRef(0);

  const setCurrentListing = useCallback(
    (listing: MatchmakingListing | null) => {
      setCurrentListingInternal(listing);
      if (!listing) {
        setListingMatchDetails(null);
        setIsSearching(false);
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
      setPendingBids((prevBids) => (prevBids.length > 0 ? [] : prevBids));
      return;
    }
    try {
      const response = await fetch(
        `/api/listings/${currentListing.listingId}/bids`
      );
      if (!response.ok) {
        setPendingBids((prevBids) => (prevBids.length > 0 ? [] : prevBids));
        return;
      }
      const data = await response.json();

      if (data.bids && Array.isArray(data.bids)) {
        const fetchedBids: PopulatedBid[] = data.bids;
        const newPendingBidsList = fetchedBids.filter(
          (bid: IBid) => bid.status === BidStatus.PENDING
        );

        setPendingBids((prevPendingBids) => {
          const currentBidsMap = new Map(
            prevPendingBids.map((b) => [b.bidId || b._id.toString(), b])
          );
          const newBidsMap = new Map(
            newPendingBidsList.map((b) => [b.bidId || b._id.toString(), b])
          );

          let hasChanged = false;
          if (prevPendingBids.length !== newPendingBidsList.length) {
            hasChanged = true;
          } else {
            for (const [bidId, newBid] of newBidsMap) {
              const currentBid = currentBidsMap.get(bidId);
              if (
                !currentBid ||
                currentBid.proposedFee !== newBid.proposedFee ||
                (currentBid.travelerDetails?.name !==
                  newBid.travelerDetails?.name &&
                  (currentBid.travelerDetails?.name ||
                    newBid.travelerDetails?.name)) || // Check if name exists before comparing
                (currentBid.travelerDetails?.rating !==
                  newBid.travelerDetails?.rating &&
                  (currentBid.travelerDetails?.rating !== undefined ||
                    newBid.travelerDetails?.rating !== undefined)) // Check if rating exists
              ) {
                hasChanged = true;
                break;
              }
            }
          }

          if (hasChanged) {
            if (
              newPendingBidsList.length > prevPendingBids.length &&
              drawerOpen &&
              currentListing
            ) {
              toast.info(
                `New bid(s) received for ${currentListing.itemDescription}!`
              );
            }
            return newPendingBidsList;
          }
          return prevPendingBids;
        });
      } else {
        setPendingBids((prevBids) => (prevBids.length > 0 ? [] : prevBids));
      }
    } catch (error) {
      // console.warn("Error fetching bids:", error);
      setPendingBids((prevBids) => (prevBids.length > 0 ? [] : prevBids));
    }
  }, [currentListing, listingMatchDetails?.isMatch, drawerOpen]);

  useEffect(() => {
    if (
      isSearching &&
      currentListing &&
      currentListing.listingId &&
      !listingMatchDetails?.isMatch
    ) {
      fetchBidsForCurrentListing(); // Initial fetch
      pollingIntervalRef.current = setInterval(
        fetchBidsForCurrentListing,
        1000 // Polling every 1 second as per original, optimization is in conditional update
      );
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (!listingMatchDetails?.isMatch) {
        setPendingBids((prevBids) => (prevBids.length > 0 ? [] : prevBids));
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

  // ... (useEffect for fetchInitialAvailableUsers - no changes needed here)
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
              const userSearchRadius = user.availabilityData.radius || 50; // Default to 50km if not specified
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

  // ... (useEffect for simulating foundUsers - no changes needed here)
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
          clearInterval(interval); // Stop if all available users have been "found"
        }
      }, 5000 + Math.random() * 5000); // Simulate finding users at random intervals
      return () => clearInterval(interval);
    }
  }, [isSearching, availableUsers, foundUsers]);

  // ... (useEffect for handleDrawerStateChange - no changes needed here)
  useEffect(() => {
    const handleDrawerStateChange = (event: CustomEvent) => {
      setDrawerOpen(event.detail.isOpen);
    };
    // Ensure window is defined (for client-side execution)
    if (typeof window !== "undefined") {
      window.addEventListener(
        "matchmaking-drawer-state-change",
        handleDrawerStateChange as EventListener
      );
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "matchmaking-drawer-state-change",
          handleDrawerStateChange as EventListener
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!drawerOpen && isSearching && !listingMatchDetails?.isMatch) {
      const currentPendingBidsCount = pendingBids.length;
      let toastMessage = `Finding Travellers`;
      let toastSubMessage = `Found ${foundUsers.length} traveller${
        foundUsers.length !== 1 ? "s" : ""
      }`;

      if (
        currentPendingBidsCount > 0 &&
        currentPendingBidsCount > prevPendingBidsCountRef.current
      ) {
        toastMessage = `${currentPendingBidsCount} New Bid(s)!`;
        if (currentListing) {
          toastSubMessage = `For: ${currentListing.itemDescription.substring(
            0,
            20
          )}...`;
        }
      } else if (currentPendingBidsCount > 0 && currentListing) {
        toastMessage = `${currentPendingBidsCount} Bid(s) Received`;
        toastSubMessage = `For: ${currentListing.itemDescription.substring(
          0,
          20
        )}...`;
      }

      const id = toast.custom(
        () => (
          <div
            className="bg-background border border-primary/20 rounded-lg p-4 shadow-lg cursor-pointer flex items-center gap-3"
            onClick={() => {
              onOpenDrawer();
              setDrawerOpen(true); // Manually set drawerOpen as onOpenDrawer might be delayed
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
              <div className="font-medium">{toastMessage}</div>
              <div className="text-sm text-muted-foreground">
                {toastSubMessage}
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
      prevPendingBidsCountRef.current = currentPendingBidsCount;
    } else if (toastId && (drawerOpen || listingMatchDetails?.isMatch)) {
      toast.dismiss(toastId);
      setToastId(null);
      prevPendingBidsCountRef.current = pendingBids.length; // Update ref to current count when toast is dismissed by drawer opening
    }

    return () => {
      if (toastId) {
        // Do not dismiss here if the drawer is managing its own visibility of this toast
        // toast.dismiss(toastId);
      }
    };
  }, [
    drawerOpen,
    isSearching,
    elapsedTime,
    foundUsers.length,
    pendingBids, // Keep pendingBids array as dependency
    onOpenDrawer,
    // toastId, // Removing toastId to prevent loops if toast.custom returns a new id each time
    listingMatchDetails?.isMatch,
    currentListing?.itemDescription, // Use specific property
    formatTime, // Add formatTime
  ]);

  // Effect to dismiss toast if isSearching becomes false and it's not a match
  useEffect(() => {
    if (!isSearching && !listingMatchDetails?.isMatch && toastId) {
      toast.dismiss(toastId);
      setToastId(null);
      prevPendingBidsCountRef.current = 0;
    }
  }, [isSearching, listingMatchDetails?.isMatch, toastId]);

  const startSearching = (listingDetails: MatchmakingListing) => {
    // ...
    if (!listingDetails.listingId) {
      console.error("Cannot start searching without a listingId.");
      toast.error("Error: Listing details are incomplete for matchmaking.");
      return;
    }
    setCurrentListing(listingDetails);
    setIsSearching(true);
    setElapsedTime(0);
    setFoundUsers([]);
    setPendingBids([]);
    setListingMatchDetails(null);
    prevPendingBidsCountRef.current = 0; // Reset for new search
    onOpenDrawer();
    setDrawerOpen(true);
  };

  const stopSearching = () => {
    // ...
    setIsSearching(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (toastId) {
      toast.dismiss(toastId);
      setToastId(null);
    }
    // prevPendingBidsCountRef.current can remain as is, will be updated/reset by other flows
  };

  const openMatchmakingDrawer = () => {
    onOpenDrawer();
    setDrawerOpen(true);
  };

  const acceptBid = async (bidId: string) => {
    // ...
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

      // Fetch the fully updated listing from the server
      const listingResponse = await fetch(
        `/api/listings/${currentListing.listingId}`
      );
      let finalListingData: IListing | MatchmakingListing;
      if (listingResponse.ok) {
        const updatedListingPayload = await listingResponse.json();
        finalListingData = updatedListingPayload.listing as IListing;
      } else {
        // Fallback if fetch fails, use current listing data and add OTPs
        finalListingData = {
          ...currentListing,
          status: ListingStatus.MATCHED,
          otpBuyer: result.otpBuyer, // otpBuyer from accept bid response
          otpTraveler: result.otpTraveler, // otpTraveler from accept bid response
        } as MatchmakingListing;
      }

      setListingMatchDetails({
        listing: finalListingData,
        acceptedBid: acceptedBidDetails,
        isMatch: true,
      });
      setCurrentListing(finalListingData as MatchmakingListing); // Update currentListing with potentially new OTPs and status

      setIsSearching(false); // Stop searching
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setPendingBids([]); // Clear pending bids as match is found
      if (toastId) {
        // Dismiss persistent toast
        toast.dismiss(toastId);
        setToastId(null);
      }
    } catch (error) {
      console.error("Error accepting bid:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not accept bid."
      );
    }
  };

  const declineBid = async (bidId: string) => {
    // ...
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
      setPendingBids((prevBids) => {
        const newBids = prevBids.filter(
          (b) => (b.bidId || b._id.toString()) !== bidId
        );
        prevPendingBidsCountRef.current = newBids.length; // Update ref
        return newBids;
      });
    } catch (error) {
      console.error("Error declining bid:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not decline bid."
      );
    }
  };

  const clearMatchDetails = () => {
    // ...
    setListingMatchDetails(null);
    setCurrentListing(null);
    setIsSearching(false);
    setPendingBids([]);
    setFoundUsers([]);
    setElapsedTime(0);
    prevPendingBidsCountRef.current = 0;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (toastId) {
      toast.dismiss(toastId);
      setToastId(null);
    }
    // The drawer closing should be handled by its onOpenChange prop
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
