/**
 * This file contains global styles for Google Maps that need to be applied
 * directly to the map instance.
 */

/**
 * Applies custom styles to the Google Maps InfoWindow
 */
export function applyCustomInfoWindowStyles() {
  // Apply custom styles to all info windows
  const style = document.createElement("style");
  style.textContent = `
    .gm-style .gm-style-iw-c {
      padding: 0 !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15) !important;
    }
    
    .gm-style .gm-style-iw-d {
      overflow: hidden !important;
      padding: 0 !important;
    }
    
    .gm-style .gm-style-iw-t::after {
      background: linear-gradient(45deg, rgba(255, 255, 255, 1) 50%, rgba(255, 255, 255, 0) 51%, rgba(255, 255, 255, 0) 100%) !important;
      box-shadow: -2px 2px 2px 0 rgba(0, 0, 0, 0.1) !important;
    }
    
    .gm-ui-hover-effect {
      top: 0 !important;
      right: 0 !important;
      background: rgba(0, 0, 0, 0.05) !important;
      border-radius: 0 12px 0 12px !important;
    }
    
    /* Custom styles for our info window content */
    .custom-info-window {
      padding: 16px !important;
      max-width: 250px !important;
    }
    
    .live-location-badge {
      display: inline-block !important;
      background-color: #10b981 !important;
      color: white !important;
      font-size: 12px !important;
      padding: 2px 8px !important;
      border-radius: 12px !important;
      margin-top: 5px !important;
    }
  `;

  document.head.appendChild(style);
}

/**
 * Applies custom styles to the Google Maps Circle elements
 */
export function applyCustomCircleStyles() {
  // Apply pulsing animation to radius circles
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulse {
      0% {
        transform: scale(0.95);
        opacity: 0.7;
      }
      50% {
        transform: scale(1.05);
        opacity: 0.4;
      }
      100% {
        transform: scale(0.95);
        opacity: 0.7;
      }
    }
    
    .radius-circle {
      animation: pulse 2s infinite;
    }
  `;

  document.head.appendChild(style);
}
