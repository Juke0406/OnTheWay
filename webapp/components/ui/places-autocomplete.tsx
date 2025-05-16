"use client";

import { loadGoogleMapsApi } from "@/lib/google-maps";
import { useEffect, useRef, useState } from "react";

interface PlacesAutocompleteProps {
  value: string;
  onChange: (
    value: string,
    placeDetails?: google.maps.places.PlaceResult
  ) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PlacesAutocomplete({
  value,
  onChange,
  placeholder = "Enter a location",
  className,
  disabled = false,
}: PlacesAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // Load Google Maps API
  useEffect(() => {
    loadGoogleMapsApi()
      .then(() => {
        setGoogleMapsLoaded(true);
      })
      .catch((error) => {
        console.error("Error loading Google Maps API:", error);
      });
  }, []);

  // Update internal input value when external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Create the input element and initialize autocomplete
  useEffect(() => {
    if (!googleMapsLoaded || !containerRef.current) return;

    // Clear the container
    if (containerRef.current.firstChild) {
      containerRef.current.innerHTML = "";
    }

    // Create a new input element
    const input = document.createElement("input");
    input.type = "text";
    input.value = inputValue;
    input.placeholder = placeholder || "";
    input.className = `w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
      className || ""
    }`;
    input.disabled = disabled;
    input.setAttribute("autocomplete", "off"); // Disable browser autocomplete

    // Add the input to the container
    containerRef.current.appendChild(input);
    inputRef.current = input;

    // Initialize Google Places Autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(input, {
      types: ["address"],
    });

    // Apply custom styles to the dropdown
    // This needs to be done after a short delay to ensure the dropdown is created
    setTimeout(() => {
      // Add a style tag to the document head
      const styleTag = document.createElement("style");
      styleTag.innerHTML = `
        .pac-container {
          z-index: 2147483647 !important; /* Maximum possible z-index value */
          position: fixed !important; /* Changed from absolute to fixed */
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
          border-radius: 0.375rem !important;
          margin-top: 2px !important;
          font-family: inherit !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          pointer-events: auto !important;
          background-color: white !important;
          isolation: isolate !important;
        }
        .pac-item {
          padding: 8px 12px !important;
          cursor: pointer !important;
          pointer-events: auto !important;
        }
        .pac-item:hover {
          background-color: rgba(0, 0, 0, 0.05) !important;
        }
        .pac-item-selected {
          background-color: rgba(0, 0, 0, 0.05) !important;
        }
        /* Fix for dropdown being hidden behind other elements */
        .pac-container:after {
          display: none !important;
        }
      `;
      document.head.appendChild(styleTag);

      // Add event listeners to prevent clicks from closing the dialog
      document.addEventListener(
        "click",
        (e) => {
          const pacContainer = document.querySelector(".pac-container");
          if (pacContainer && pacContainer.contains(e.target as Node)) {
            e.stopPropagation();
          }
        },
        true
      );
    }, 100);

    // Add place_changed listener
    const listener = autocompleteRef.current.addListener(
      "place_changed",
      () => {
        const place = autocompleteRef.current?.getPlace();
        if (place) {
          const address = place.formatted_address || place.name || "";
          if (address) {
            // Update the input value
            if (inputRef.current) {
              inputRef.current.value = address;
            }

            // Notify parent component
            onChange(address, place);

            // Update internal state
            setInputValue(address);

            console.log("Place selected:", place);
          }
        }
      }
    );

    // Add input change listener
    input.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      setInputValue(target.value);
      onChange(target.value);
    });

    // Prevent form submission on Enter
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
      }
    });

    // Clean up
    return () => {
      if (google && google.maps && listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [
    googleMapsLoaded,
    inputValue,
    placeholder,
    className,
    disabled,
    onChange,
  ]);

  return (
    <div
      ref={containerRef}
      className="w-full relative"
      style={{
        position: "relative",
        zIndex: 1000, // Higher z-index to ensure proper stacking
      }}
      onClick={(e) => {
        // Prevent clicks on the input from propagating to parent elements
        e.stopPropagation();
      }}
    ></div>
  );
}
