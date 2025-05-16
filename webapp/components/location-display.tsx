"use client";

import { getCachedAddressFromCoordinates } from "@/lib/geocoding";
import { cn } from "@/lib/utils";
import { ILocation } from "@/models/types";
import { MapPin, Navigation } from "lucide-react";
import { useEffect, useState } from "react";

interface LocationDisplayProps {
  location?: ILocation & {
    address?: string;
  };
  type?: "pickup" | "destination";
  className?: string;
}

export function LocationDisplay({
  location,
  type = "pickup",
  className,
}: LocationDisplayProps) {
  const [address, setAddress] = useState<string>("Loading address...");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Format location for initial display
    const formatInitialLocation = () => {
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

    // Set initial value
    setAddress(formatInitialLocation());
    setIsLoading(true);

    // Convert coordinates to address if available
    if (location?.latitude && location?.longitude) {
      getCachedAddressFromCoordinates(
        location.latitude,
        location.longitude
      ).then((formattedAddress) => {
        setAddress(formattedAddress);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [location]);

  const Icon = type === "pickup" ? MapPin : Navigation;

  return (
    <div className={cn("flex items-start gap-2.5 group", className)}>
      <div className="rounded-full bg-muted/60 p-1.5 mt-0.5 group-hover:bg-primary/10 transition-colors">
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="flex-1">
        {isLoading ? (
          <div className="h-5 w-full max-w-[200px] bg-muted/60 animate-pulse rounded"></div>
        ) : (
          <p className="text-sm">{address}</p>
        )}
      </div>
    </div>
  );
}
