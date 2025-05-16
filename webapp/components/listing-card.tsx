import { getCachedAddressFromCoordinates } from "@/lib/geocoding";
import { IListing } from "@/models/types";
import { MapPin } from "lucide-react";
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
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-medium line-clamp-2">
            {listing.itemDescription}
          </CardTitle>
          <Badge variant={isOwner ? "default" : "secondary"}>
            {isOwner ? "Your Listing" : `$${listing.maxFee} Fee`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Item Price:</span>
            <span className="font-medium">${listing.itemPrice}</span>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Pickup:</span>
              <span className="line-clamp-1">{pickupLocation}</span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                Destination:
              </span>
              <span className="line-clamp-1">{destinationLocation}</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onViewDetails && onViewDetails(listing)}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
