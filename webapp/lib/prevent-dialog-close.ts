"use client";

/**
 * Adds a global event listener to prevent dialog from closing when clicking on Places Autocomplete dropdown
 * This is needed because the Places Autocomplete dropdown is rendered outside the dialog in the DOM
 */
export function setupPlacesAutocompleteClickHandler() {
  // Only run in browser environment
  if (typeof window === "undefined") return;

  // Add a global click event listener with capture phase
  document.addEventListener(
    "click",
    (e) => {
      // Check if the click is on a Places Autocomplete dropdown
      const pacContainer = document.querySelector(".pac-container");
      if (pacContainer && pacContainer.contains(e.target as Node)) {
        // Prevent the event from propagating to dialog backdrop
        e.stopPropagation();
      }
    },
    true // Use capture phase to intercept the event before it reaches the dialog
  );

  // Add a mutation observer to watch for the pac-container being added to the DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (
            node instanceof HTMLElement &&
            node.classList.contains("pac-container")
          ) {
            // Add specific styles to ensure it's above everything else
            node.style.zIndex = "2147483647"; // Maximum possible z-index
            node.style.position = "fixed";
            node.style.backgroundColor = "white";
            
            // Prevent clicks from propagating
            node.addEventListener("click", (e) => {
              e.stopPropagation();
            });
          }
        });
      }
    });
  });

  // Start observing the document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => {
    // Cleanup function
    observer.disconnect();
  };
}
