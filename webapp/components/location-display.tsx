"use client";

import { getCachedAddressFromCoordinates } from "@/lib/geocoding";
import { ILocation } from "@/models/types";
import { useEffect, useState } from "react";

interface LocationDisplayProps {
  location?: ILocation & {
    address?: string;
  };
}

export function LocationDisplay({ location }: LocationDisplayProps) {
  const [address, setAddress] = useState<string>("Loading address...");

  useEffect(() => {
    // Format location for initial display
    const formatInitialLocation = () => {
      if (!location) return "Not specified";
      
      if (typeof location === "object" && location.address) {
        return location.address;
      }
      
      if (typeof location === "object" && location.latitude && location.longitude) {
        return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
      }
      
      return "Location available";
    };

    // Set initial value
    setAddress(formatInitialLocation());

    // Convert coordinates to address if available
    if (location?.latitude && location?.longitude) {
      getCachedAddressFromCoordinates(
        location.latitude,
        location.longitude
      ).then((formattedAddress) => {
        setAddress(formattedAddress);
      });
    }
  }, [location]);

  return <p>{address}</p>;
}
