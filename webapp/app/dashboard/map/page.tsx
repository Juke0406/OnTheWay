"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { micah } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { useEffect, useState } from "react";

// Define the user interface
interface AvailableUser {
  userId: string;
  username?: string;
  name: string;
  image?: string;
  rating: number;
  availabilityData: {
    location: {
      latitude: number;
      longitude: number;
    };
    isLiveLocation?: boolean;
  };
}

export default function MapPage() {
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  // Load Google Maps API
  useEffect(() => {
    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    // Load Google Maps API
    const googleMapsScript = document.createElement("script");
    googleMapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    googleMapsScript.async = true;
    googleMapsScript.defer = true;
    googleMapsScript.onload = () => {
      setGoogleMapsLoaded(true);
    };
    document.head.appendChild(googleMapsScript);

    return () => {
      // Clean up script if component unmounts before loading
      if (document.head.contains(googleMapsScript)) {
        document.head.removeChild(googleMapsScript);
      }
    };
  }, []);

  // Fetch available users
  useEffect(() => {
    const fetchAvailableUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/users/available");

        if (!response.ok) {
          throw new Error("Failed to fetch available users");
        }

        const data = await response.json();
        setAvailableUsers(data.users);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching available users:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableUsers();
  }, []);

  // Initialize map when Google Maps is loaded
  useEffect(() => {
    if (!googleMapsLoaded) return;

    // Default center (can be adjusted based on user's location)
    const defaultCenter = { lat: 1.3521, lng: 103.8198 }; // Singapore coordinates

    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    const mapOptions: google.maps.MapOptions = {
      center: defaultCenter,
      zoom: 12,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    };

    const newMap = new google.maps.Map(mapElement, mapOptions);
    setMap(newMap);

    // Add markers for available users
    if (availableUsers.length > 0) {
      const bounds = new google.maps.LatLngBounds();

      availableUsers.forEach((user) => {
        if (!user.availabilityData?.location) return;

        const position = {
          lat: user.availabilityData.location.latitude,
          lng: user.availabilityData.location.longitude,
        };

        // Generate avatar SVG
        const avatar = createAvatar(micah, {
          seed: user.userId,
          size: 128,
        });

        const svgData = avatar.toString();
        const svgUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          svgData
        )}`;

        // Create custom marker with avatar
        const marker = new google.maps.Marker({
          position,
          map: newMap,
          title: user.name,
          icon: {
            url: svgUrl,
            scaledSize: new google.maps.Size(40, 40),
          },
        });

        // Add info window with user details
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 10px;">
              <h3 style="margin: 0 0 5px 0;">${user.name}</h3>
              <p style="margin: 0 0 5px 0;">Rating: ${user.rating}/5</p>
              ${
                user.availabilityData.isLiveLocation
                  ? '<p style="margin: 0; color: green;">Live Location</p>'
                  : ""
              }
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(newMap, marker);
        });

        bounds.extend(position);
      });

      // Fit map to show all markers
      if (!bounds.isEmpty()) {
        newMap.fitBounds(bounds);
      }
    }
  }, [googleMapsLoaded, availableUsers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-medium">Available Deliverers</h1>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Deliverers Map</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {availableUsers.length === 0 && !isLoading && !error ? (
            <div className="text-center py-8 text-muted-foreground">
              No deliverers available at the moment.
            </div>
          ) : (
            <div id="map" className="w-full h-[500px] rounded-md"></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
