"use client";

import { loadGoogleMapsApi } from "@/lib/google-maps";
import { micah } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { useEffect, useState } from "react";
import {
  applyCustomCircleStyles,
  applyCustomInfoWindowStyles,
} from "./global-map-styles";
import "./map-styles.css";

// Define the user interface (removed name and image for privacy)
interface AvailableUser {
  userId: string;
  telegramId?: number;
  rating: number;
  availabilityData: {
    location: {
      latitude: number;
      longitude: number;
    };
    isLiveLocation?: boolean;
    radius?: number; // Radius in kilometers
  };
}

export default function MapPage() {
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  // Load Google Maps API
  useEffect(() => {
    // Use the utility function to load Google Maps API
    loadGoogleMapsApi()
      .then(() => {
        setGoogleMapsLoaded(true);
      })
      .catch((error) => {
        console.error("Error loading Google Maps API:", error);
        setError("Failed to load Google Maps. Please try again later.");
      });
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

    // Enable WebGL for 3D rendering
    const webGLSupported = !!window.WebGLRenderingContext;

    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    const mapOptions: google.maps.MapOptions = {
      center: defaultCenter,
      zoom: 8, // Much lower zoom level to show a wider area (city-level view)
      mapTypeId: "roadmap", // Default to roadmap instead of satellite/hybrid
      tilt: webGLSupported ? 45 : 0, // Add a 45-degree tilt for 3D effect if WebGL is supported
      heading: 0, // Initial heading
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
      mapTypeControl: false, // Disable map type control (satellite/roadmap toggle)
      streetViewControl: false, // Disable street view
      fullscreenControl: false, // Disable fullscreen
      rotateControl: false, // Disable rotation control
      zoomControl: false, // Disable zoom controls
      scaleControl: false, // Disable scale control
      panControl: false, // Disable pan control
      disableDefaultUI: true, // Disable all default UI controls
      gestureHandling: "greedy", // Makes the map easier to use on touch devices
    };

    const newMap = new google.maps.Map(mapElement, mapOptions);

    // Apply custom styles for info windows and circles
    applyCustomInfoWindowStyles();
    applyCustomCircleStyles();

    // Add markers for available users
    const bounds = new google.maps.LatLngBounds();

    if (availableUsers.length > 0) {
      availableUsers.forEach((user) => {
        if (!user.availabilityData?.location) return;

        const position = {
          lat: user.availabilityData.location.latitude,
          lng: user.availabilityData.location.longitude,
        };

        // Generate avatar SVG using telegramId as seed for consistency
        const avatar = createAvatar(micah, {
          seed: user.telegramId?.toString() || user.userId, // Use telegramId if available, fallback to userId
          size: 128,
        });

        const svgData = avatar.toString();
        const svgUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          svgData
        )}`;

        // Create radius circle to show the deliverer's available radius
        const radius = user.availabilityData.radius || 3; // Default to 3km if not specified
        const radiusCircle = new google.maps.Circle({
          strokeColor: "#4f46e5",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#4f46e5",
          fillOpacity: 0.1,
          map: newMap,
          center: position,
          radius: radius * 1000, // Convert km to meters
          zIndex: 1,
          // @ts-ignore - className is not in the type definitions but works for styling
          className: "radius-circle",
        });

        // Add a unique ID to the circle for targeting
        const circleId = `circle-${user.userId}`;
        radiusCircle.set("id", circleId);

        // Create a custom overlay for the radar pulse effect
        class RadarPulseOverlay extends google.maps.OverlayView {
          private div: HTMLDivElement;
          private position: google.maps.LatLng;

          constructor(position: google.maps.LatLng, _radius: number) {
            super();
            this.position = position;
            // _radius is used for visual scaling reference but not directly used in this class
            this.div = document.createElement("div");
          }

          onAdd() {
            const panes = this.getPanes();
            if (!panes) return;

            this.div.className = "radar-pulse-container";
            this.div.style.position = "absolute";
            this.div.style.width = "60px";
            this.div.style.height = "60px";
            this.div.style.zIndex = "1";

            // Create pulse rings
            for (let i = 0; i < 3; i++) {
              const ring = document.createElement("div");
              ring.className = "radar-pulse-ring";
              ring.style.position = "absolute";
              ring.style.top = "50%";
              ring.style.left = "50%";
              ring.style.width = "20px";
              ring.style.height = "20px";
              ring.style.borderRadius = "50%";
              ring.style.backgroundColor = "rgba(79, 70, 229, 0.6)";
              ring.style.transform = "translate(-50%, -50%)";
              ring.style.animation = `radar-pulse 3s infinite ${
                i * 0.7
              }s cubic-bezier(0, 0, 0.2, 1)`;

              this.div.appendChild(ring);
            }

            panes.overlayLayer.appendChild(this.div);
          }

          draw() {
            const overlayProjection = this.getProjection();
            const point = overlayProjection.fromLatLngToDivPixel(this.position);

            if (point) {
              this.div.style.left = point.x - 30 + "px";
              this.div.style.top = point.y - 30 + "px";
            }
          }

          onRemove() {
            if (this.div.parentNode) {
              this.div.parentNode.removeChild(this.div);
            }
          }
        }

        // Add the radar pulse overlay
        const radarPulse = new RadarPulseOverlay(
          new google.maps.LatLng(position.lat, position.lng),
          radius * 1000
        );
        radarPulse.setMap(newMap);

        // Add keyframes for the radar pulse animation
        if (!document.getElementById("radar-pulse-style")) {
          const style = document.createElement("style");
          style.id = "radar-pulse-style";
          style.textContent = `
            @keyframes radar-pulse {
              0% {
                transform: translate(-50%, -50%) scale(0.1);
                opacity: 0.9;
                box-shadow: 0 0 10px rgba(79, 70, 229, 0.8);
              }
              50% {
                opacity: 0.5;
                box-shadow: 0 0 20px rgba(79, 70, 229, 0.5);
              }
              100% {
                transform: translate(-50%, -50%) scale(30);
                opacity: 0;
                box-shadow: 0 0 0px rgba(79, 70, 229, 0);
              }
            }

            .radar-pulse-ring {
              pointer-events: none;
            }
          `;
          document.head.appendChild(style);
        }

        // Create custom marker with avatar (no name for privacy)
        // @ts-ignore - Marker is deprecated but still works
        const marker = new google.maps.Marker({
          position,
          map: newMap,
          title: "Deliverer", // Generic title for privacy
          icon: {
            url: svgUrl,
            scaledSize: new google.maps.Size(50, 50),
            anchor: new google.maps.Point(25, 25), // Center the marker
          },
          zIndex: 2, // Ensure marker appears above the circle
        });

        // Apply custom CSS class to the marker element
        // We need to wait for the marker to be added to the DOM
        setTimeout(() => {
          // Find the marker element by its URL
          const markerElement = marker.getIcon()
            ? (document.querySelector(
                `img[src="${svgUrl}"]`
              ) as HTMLImageElement)
            : null;

          console.log("Found marker element:", markerElement);

          if (markerElement) {
            // Add a wrapper div to handle the hover effect
            const parent = markerElement.parentElement;
            if (parent) {
              // Style the parent container
              parent.style.position = "relative";
              parent.style.zIndex = "1";
              parent.style.transition = "z-index 0.1s";

              // Create a wrapper for the avatar
              const wrapper = document.createElement("div");
              wrapper.className = "avatar-wrapper";
              wrapper.style.position = "absolute";
              wrapper.style.top = "0";
              wrapper.style.left = "0";
              wrapper.style.width = "100%";
              wrapper.style.height = "100%";
              wrapper.style.display = "flex";
              wrapper.style.alignItems = "center";
              wrapper.style.justifyContent = "center";
              wrapper.style.pointerEvents = "none";

              // Move the marker into our wrapper
              parent.appendChild(wrapper);

              // Style the marker
              markerElement.style.transition =
                "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)";
              markerElement.style.backgroundColor = "#fff";
              markerElement.style.padding = "3px";
              markerElement.style.border = "3px solid white";
              markerElement.style.borderRadius = "50%";
              markerElement.style.cursor = "pointer";

              // Add hover event listeners to the parent (which receives mouse events)
              parent.addEventListener("mouseenter", () => {
                markerElement.style.transform = "scale(1.4)";
                markerElement.style.boxShadow =
                  "0 0 20px rgba(79, 70, 229, 0.8)";
                markerElement.style.borderColor = "rgba(79, 70, 229, 1)";
                parent.style.zIndex = "999";
              });

              parent.addEventListener("mouseleave", () => {
                markerElement.style.transform = "scale(1)";
                markerElement.style.boxShadow =
                  "0 0 10px rgba(255, 255, 255, 0.5)";
                markerElement.style.borderColor = "white";
                parent.style.zIndex = "1";
              });
            }
          }
        }, 1000);

        // Add info window with user details (without name for privacy)
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="custom-info-window">
              <p>Rating: ${user.rating}/5 ⭐</p>
              <p>Available radius: ${radius} km</p>
              ${
                user.availabilityData.isLiveLocation
                  ? '<span class="live-location-badge">Live Location</span>'
                  : ""
              }
            </div>
          `,
          pixelOffset: new google.maps.Size(0, -25),
        });

        // Add hover effect
        marker.addListener("mouseover", () => {
          radiusCircle.setOptions({
            fillOpacity: 0.3,
            strokeOpacity: 1,
          });
        });

        marker.addListener("mouseout", () => {
          radiusCircle.setOptions({
            fillOpacity: 0.1,
            strokeOpacity: 0.8,
          });
        });

        // Add click event
        marker.addListener("click", () => {
          infoWindow.open(newMap, marker);
        });

        bounds.extend(position);
      });

      // Fit map to show all markers if there are any
      if (!bounds.isEmpty()) {
        newMap.fitBounds(bounds);

        // Add a listener for when the bounds_changed event fires
        // This ensures we don't zoom in too much even when fitting bounds
        google.maps.event.addListenerOnce(
          newMap,
          "bounds_changed",
          function () {
            // If zoom level is too high (too zoomed in), set it to our preferred level
            const currentZoom = newMap.getZoom();
            if (currentZoom !== undefined && currentZoom > 12) {
              newMap.setZoom(12);
            }
          }
        );
      }
    } else {
      // If no users are available, set a nice default view
      // Use a lower zoom level to show a wider area (city-level view)
      newMap.setZoom(8);

      // Add a slight tilt for 3D effect even when zoomed out
      setTimeout(() => {
        try {
          if (webGLSupported) {
            // Keep the default roadmap mode
            // No need to set map type as we've disabled the controls

            // Force the 3D view with tilt
            // setTilt is available but not in the types
            // We need to use a type assertion here because setTilt is not in the type definitions
            const mapWithTilt = newMap as unknown as {
              setTilt?: (tilt: number) => void;
            };
            if (mapWithTilt.setTilt) {
              mapWithTilt.setTilt(45);
            }

            // Force a resize to ensure the map renders properly
            google.maps.event.trigger(newMap, "resize");

            // Add a message about no available deliverers
            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div class="custom-info-window">
                  <p><strong>No Deliverers Available</strong></p>
                  <p>There are currently no available deliverers in your area.</p>
                  <p>Please check back later or try a different location.</p>
                </div>
              `,
              position: defaultCenter,
            });

            // Open the info window after a short delay
            setTimeout(() => {
              infoWindow.open(newMap);
            }, 1000);
          }
        } catch (e) {
          console.error("Error setting 3D view:", e);
        }
      }, 500);
    }
  }, [googleMapsLoaded, availableUsers]);

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      {error && (
        <div className="absolute top-4 left-4 right-4 z-10 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      <div id="map" className="absolute inset-0"></div>
    </div>
  );
}
