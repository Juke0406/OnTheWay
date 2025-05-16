import { IListing } from "@/models/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { MapPin } from "lucide-react";

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
  // Format pickup and destination locations for display
  const formatLocation = (location: any) => {
    if (!location) return "Not specified";
    
    if (typeof location === "object" && location.address) {
      return location.address;
    }
    
    if (typeof location === "object" && location.latitude && location.longitude) {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
    
    return "Location available";
  };

  const pickupLocation = formatLocation(listing.pickupLocation);
  const destinationLocation = formatLocation(listing.destinationLocation);

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
              <span className="text-xs text-muted-foreground">Destination:</span>
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
