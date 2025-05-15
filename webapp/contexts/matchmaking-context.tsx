"use client";

import { Earth } from "lucide-react";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

// Define the user interface (similar to the map page)
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

interface MatchmakingContextType {
  isSearching: boolean;
  elapsedTime: number;
  foundUsers: AvailableUser[];
  startSearching: () => void;
  stopSearching: () => void;
  formatTime: (seconds: number) => string;
  openMatchmakingDrawer: () => void;
}

const MatchmakingContext = createContext<MatchmakingContextType | undefined>(
  undefined
);

export function useMatchmaking() {
  const context = useContext(MatchmakingContext);
  if (context === undefined) {
    throw new Error("useMatchmaking must be used within a MatchmakingProvider");
  }
  return context;
}

interface MatchmakingProviderProps {
  children: ReactNode;
  onOpenDrawer: () => void;
}

export function MatchmakingProvider({
  children,
  onOpenDrawer,
}: MatchmakingProviderProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [foundUsers, setFoundUsers] = useState<AvailableUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [toastId, setToastId] = useState<string | number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isSearching) {
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSearching]);

  // Fetch available users
  useEffect(() => {
    if (isSearching) {
      fetchAvailableUsers();
    }
  }, [isSearching]);

  // Simulate finding users over time
  useEffect(() => {
    if (isSearching && availableUsers.length > 0) {
      const interval = setInterval(() => {
        // Randomly select a user that hasn't been found yet
        const remainingUsers = availableUsers.filter(
          (user) => !foundUsers.some((found) => found.userId === user.userId)
        );

        if (remainingUsers.length > 0) {
          const randomIndex = Math.floor(Math.random() * remainingUsers.length);
          const newUser = remainingUsers[randomIndex];
          setFoundUsers((prev) => [...prev, newUser]);
        } else {
          clearInterval(interval);
        }
      }, 3000); // Find a new user every 3 seconds

      return () => clearInterval(interval);
    }
  }, [isSearching, availableUsers, foundUsers]);

  // Listen for drawer state changes from the MatchmakingDrawer component
  useEffect(() => {
    const handleDrawerStateChange = (event: CustomEvent) => {
      setDrawerOpen(event.detail.isOpen);
    };

    // Add event listener
    window.addEventListener(
      "matchmaking-drawer-state-change",
      handleDrawerStateChange as EventListener
    );

    // Cleanup
    return () => {
      window.removeEventListener(
        "matchmaking-drawer-state-change",
        handleDrawerStateChange as EventListener
      );
    };
  }, []);

  // Toast management
  useEffect(() => {
    // Only create the toast when drawer is closed but searching is active
    if (!drawerOpen && isSearching) {
      // Create or update toast
      const id = toast.custom(
        () => (
          <div
            className="bg-background border border-primary/20 rounded-lg p-4 shadow-lg cursor-pointer flex items-center gap-3"
            onClick={() => {
              onOpenDrawer();
              setDrawerOpen(true);
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Earth className="absolute text-primary/10 w-10 h-10" />
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
              <div className="relative bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center">
                <span className="text-xs font-medium">
                  {formatTime(elapsedTime)}
                </span>
              </div>
            </div>
            <div>
              <div className="font-medium">Finding Travellers</div>
              <div className="text-sm text-muted-foreground">
                Found {foundUsers.length} traveller
                {foundUsers.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        ),
        {
          id: "matchmaking-toast",
          duration: Infinity, // Make it permanent
        }
      );

      setToastId(id);
    }
    // Only dismiss the toast when the drawer is opened
    else if (toastId && drawerOpen) {
      toast.dismiss(toastId);
      setToastId(null);
    }

    // Cleanup on unmount
    return () => {
      if (toastId) {
        toast.dismiss(toastId);
      }
    };
  }, [
    drawerOpen,
    isSearching,
    elapsedTime,
    foundUsers.length,
    onOpenDrawer,
    toastId,
  ]);

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch("/api/users/available");
      const data = await response.json();
      if (data.users) {
        setAvailableUsers(data.users);
      }
    } catch (error) {
      console.error("Error fetching available users:", error);
    }
  };

  const startSearching = () => {
    setIsSearching(true);
    setElapsedTime(0);
    setFoundUsers([]);
  };

  const stopSearching = () => {
    setIsSearching(false);
    setElapsedTime(0);
    setFoundUsers([]);
    if (toastId) {
      toast.dismiss(toastId);
      setToastId(null);
    }
  };

  const openMatchmakingDrawer = () => {
    // Just call the parent component's handler
    // The drawer state will be updated via the event listener
    onOpenDrawer();
  };

  const value = {
    isSearching,
    elapsedTime,
    foundUsers,
    startSearching,
    stopSearching,
    formatTime,
    openMatchmakingDrawer,
  };

  return (
    <MatchmakingContext.Provider value={value}>
      {children}
    </MatchmakingContext.Provider>
  );
}

// We've moved the event dispatching directly into the MatchmakingDrawer component
