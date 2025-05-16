"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/lib/auth-client";
import { IListing } from "@/models/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ListingCard } from "./listing-card";
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
      const data = await response.json();
      if (data.listings) {
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
      const data = await response.json();
      if (data.listings) {
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
          <Card>
            <CardHeader>
              <CardTitle>My Listings</CardTitle>
              <CardDescription>
                View and manage your current listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMyListings ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : myListings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myListings.map((listing) => (
                    <ListingCard
                      key={listing.listingId}
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
            </CardContent>
            <CardFooter>
              <Button className="w-full">Create New Listing</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="all-listings">
          <Card>
            <CardHeader>
              <CardTitle>All Listings</CardTitle>
              <CardDescription>Browse all available listings</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAllListings ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : allListings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allListings.map((listing) => (
                    <ListingCard
                      key={listing.listingId}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
              <CardDescription>
                Your past listings and deliveries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                No history to display.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Listing Details Dialog */}
      {selectedListing && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Listing Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <h3 className="font-medium">Item Description</h3>
                <p>{selectedListing.itemDescription}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Item Price</h3>
                  <p>${selectedListing.itemPrice}</p>
                </div>
                <div>
                  <h3 className="font-medium">Max Fee</h3>
                  <p>${selectedListing.maxFee}</p>
                </div>
              </div>
              <div>
                <h3 className="font-medium">Pickup Location</h3>
                <p>
                  {selectedListing.pickupLocation
                    ? typeof selectedListing.pickupLocation === "object" &&
                      "address" in selectedListing.pickupLocation
                      ? selectedListing.pickupLocation.address
                      : "Location coordinates available"
                    : "Not specified"}
                </p>
              </div>
              <div>
                <h3 className="font-medium">Destination Location</h3>
                <p>
                  {selectedListing.destinationLocation
                    ? typeof selectedListing.destinationLocation === "object" &&
                      "address" in selectedListing.destinationLocation
                      ? selectedListing.destinationLocation.address
                      : "Location coordinates available"
                    : "Not specified"}
                </p>
              </div>
              <div>
                <h3 className="font-medium">Status</h3>
                <p className="capitalize">{selectedListing.status}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
