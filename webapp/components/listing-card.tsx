import { getCachedAddressFromCoordinates } from "@/lib/geocoding";
import { cn } from "@/lib/utils";
import { IListing } from "@/models/types";
import {
  ArrowDown,
  DollarSign,
  MapPin,
  Navigation,
  Package,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface ListingCardProps {
  listing: IListing;
  isOwner?: boolean;
  onViewDetails?: (listing: IListing) => void;
}

export function ListingCard({
  listing,
  isOwner = false,
  onViewDetails,
}: ListingCardProps) {
  const [pickupLocation, setPickupLocation] =
    useState<string>("Loading address...");
  const [destinationLocation, setDestinationLocation] =
    useState<string>("Loading address...");

  // Format location for initial display
  const formatLocation = (location: any) => {
    if (!location) return "Not specified";

    if (typeof location === "object" && location.address) {
      return location.address;
    }

    if (
      typeof location === "object" &&
      location.latitude &&
      location.longitude
    ) {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(
        4
      )}`;
    }

    return "Location available";
  };

  // Load addresses from coordinates
  useEffect(() => {
    // Set initial values
    setPickupLocation(formatLocation(listing.pickupLocation));
    setDestinationLocation(formatLocation(listing.destinationLocation));

    // Convert pickup location coordinates to address
    if (listing.pickupLocation?.latitude && listing.pickupLocation?.longitude) {
      getCachedAddressFromCoordinates(
        listing.pickupLocation.latitude,
        listing.pickupLocation.longitude
      ).then((address) => {
        setPickupLocation(address);
      });
    }

    // Convert destination location coordinates to address
    if (
      listing.destinationLocation?.latitude &&
      listing.destinationLocation?.longitude
    ) {
      getCachedAddressFromCoordinates(
        listing.destinationLocation.latitude,
        listing.destinationLocation.longitude
      ).then((address) => {
        setDestinationLocation(address);
      });
    }
  }, [listing.pickupLocation, listing.destinationLocation]);

  return (
    <Card className="h-full flex flex-col overflow-hidden group transition-all duration-200 hover:shadow-md border-muted/80 hover:border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-start gap-2">
            <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-medium line-clamp-2">
              {listing.itemDescription}
            </CardTitle>
          </div>
          <Badge
            variant={isOwner ? "default" : "secondary"}
            className={cn(
              "transition-all duration-200",
              isOwner
                ? "bg-primary/90 group-hover:bg-primary"
                : "bg-secondary/90 group-hover:bg-secondary"
            )}
          >
            {isOwner ? "Your Listing" : `$${listing.maxFee} Fee`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4 pt-2">
        <div className="flex items-center justify-between bg-muted/40 rounded-lg p-2.5">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary/80" />
            <span className="text-sm font-medium">Item Price</span>
          </div>
          <span className="text-sm font-semibold">${listing.itemPrice}</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2.5 group/location">
            <div className="rounded-full bg-muted/60 p-1.5 mt-0.5 group-hover/location:bg-primary/10 transition-colors">
              <MapPin className="h-4 w-4 text-muted-foreground group-hover/location:text-primary transition-colors" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">
                Pickup Location
              </span>
              <span className="text-sm line-clamp-1">{pickupLocation}</span>
            </div>
          </div>

          <div className="flex justify-center my-1">
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex items-start gap-2.5 group/location">
            <div className="rounded-full bg-muted/60 p-1.5 mt-0.5 group-hover/location:bg-primary/10 transition-colors">
              <Navigation className="h-4 w-4 text-muted-foreground group-hover/location:text-primary transition-colors" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">
                Destination
              </span>
              <span className="text-sm line-clamp-1">
                {destinationLocation}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button
          variant="default"
          className="w-full group-hover:bg-primary transition-colors"
          onClick={() => onViewDetails && onViewDetails(listing)}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
