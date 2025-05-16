// Client-side type definitions for listings
// This file contains types that can be safely imported in client components

// Define listing status enum to match the server-side enum
export enum ListingStatus {
  OPEN = "open",
  MATCHED = "matched",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}
