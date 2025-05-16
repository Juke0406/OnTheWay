"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/lib/auth-client";
import { ListingStatus } from "@/lib/listing-types";
import { IListing } from "@/models/types";
import { DollarSign, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ListingCard } from "./listing-card";
import { LocationDisplay } from "./location-display";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

export function DashboardContent() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [myListings, setMyListings] = useState<IListing[]>([]);
  const [allListings, setAllListings] = useState<IListing[]>([]);
  const [isLoadingMyListings, setIsLoadingMyListings] = useState(false);
  const [isLoadingAllListings, setIsLoadingAllListings] = useState(false);
  const [selectedListing, setSelectedListing] = useState<IListing | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  // Fetch user's listings
  useEffect(() => {
    if (session) {
      fetchMyListings();
    }
  }, [session]);

  // Fetch all listings
  useEffect(() => {
    if (session) {
      fetchAllListings();
    }
  }, [session]);

  const fetchMyListings = async () => {
    try {
      setIsLoadingMyListings(true);
      const response = await fetch("/api/listings");
      const data = (await response.json()) as { listings: IListing[] };
      if (data.listings) {
        console.log("My Listings Data:", data.listings);
        const ids: string[] = data.listings.map((l: IListing) => l.listingId);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
          console.warn("Duplicate listingIds found in myListings!", ids);
        }
        if (ids.some((id: string) => id === undefined || id === null)) {
          console.warn("Missing listingIds found in myListings!", ids);
        }
        setMyListings(data.listings);
      }
    } catch (error) {
      console.error("Error fetching my listings:", error);
    } finally {
      setIsLoadingMyListings(false);
    }
  };

  const fetchAllListings = async () => {
    try {
      setIsLoadingAllListings(true);
      const response = await fetch("/api/listings/all");
      const data = (await response.json()) as { listings: IListing[] };
      if (data.listings) {
        console.log("All Listings Data:", data.listings);
        const ids: string[] = data.listings.map((l: IListing) => l.listingId);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
          console.warn("Duplicate listingIds found in allListings!", ids);
        }
        if (ids.some((id: string) => id === undefined || id === null)) {
          console.warn("Missing listingIds found in allListings!", ids);
        }
        setAllListings(data.listings);
      }
    } catch (error) {
      console.error("Error fetching all listings:", error);
    } finally {
      setIsLoadingAllListings(false);
    }
  };

  const handleViewDetails = (listing: IListing) => {
    setSelectedListing(listing);
    setDetailsOpen(true);
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect in the useEffect
  }

  // Get wallet balance from session if available
  const walletBalance = (session.user as any)?.walletBalance || 0;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium">{myListings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium">
              ${walletBalance.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="listings">
        <TabsList className="mb-8">
          <TabsTrigger value="listings">My Listings</TabsTrigger>
          <TabsTrigger value="all-listings">All Listings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          {isLoadingMyListings ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : myListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myListings.map((listing, index) => (
                <ListingCard
                  key={listing.listingId ?? `myListing-${index}`}
                  listing={listing}
                  isOwner={true}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              You don't have any listings yet.
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-listings">
          {isLoadingAllListings ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : allListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allListings.map((listing, index) => (
                <ListingCard
                  key={listing.listingId ?? `allListing-${index}`}
                  listing={listing}
                  isOwner={listing.buyerId === session.user.id}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No listings available at the moment.
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <div className="text-center py-8 text-muted-foreground">
            No history to display.
          </div>
        </TabsContent>
      </Tabs>

      {/* Listing Details Dialog */}
      {selectedListing && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader className="pb-2 border-b">
              <DialogTitle className="flex items-center gap-2">
                <div className="rounded-full bg-primary/10 p-1.5">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <span>Listing Details</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-1.5">
                  Item Description
                </h3>
                <p className="text-base">{selectedListing.itemDescription}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-lg p-4 flex flex-col">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Item Price
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <p className="text-lg font-semibold">
                      ${selectedListing.itemPrice}
                    </p>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 flex flex-col">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Max Fee
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <p className="text-lg font-semibold">
                      ${selectedListing.maxFee}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Locations</h3>
                <div className="bg-muted/30 rounded-lg p-4">
                  <LocationDisplay
                    location={selectedListing.pickupLocation}
                    type="pickup"
                    className="mb-4"
                  />
                  <div className="border-t border-dashed border-muted my-3"></div>
                  <LocationDisplay
                    location={selectedListing.destinationLocation}
                    type="destination"
                  />
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 flex items-center justify-between">
                <h3 className="text-sm font-medium">Status</h3>
                <Badge
                  variant={
                    selectedListing.status === ListingStatus.OPEN
                      ? "default"
                      : "secondary"
                  }
                  className="capitalize"
                >
                  {selectedListing.status}
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
