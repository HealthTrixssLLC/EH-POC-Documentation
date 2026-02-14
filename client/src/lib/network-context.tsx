import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { subscribeSyncState, syncAll, refreshPendingCount, retryFailed, discardMutation, type SyncState } from "./sync-manager";
import { getAllMutations, type QueuedMutation } from "./offline-db";

interface NetworkContextValue {
  isOnline: boolean;
  syncState: SyncState;
  triggerSync: () => Promise<void>;
  retryFailedMutations: () => Promise<void>;
  discardFailedMutation: (id: number) => Promise<void>;
  getFailedMutations: () => Promise<QueuedMutation[]>;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncState, setSyncState] = useState<SyncState>({
    status: "idle",
    pendingCount: 0,
    lastSyncAt: null,
    failedCount: 0,
  });
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        syncAll();
      }, 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeSyncState(setSyncState);
    refreshPendingCount();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isOnline && syncState.pendingCount > 0 && syncState.status === "idle") {
      syncAll();
    }
  }, [isOnline]);

  const triggerSync = useCallback(async () => {
    if (isOnline) await syncAll();
  }, [isOnline]);

  const retryFailedMutations = useCallback(async () => {
    if (isOnline) await retryFailed();
  }, [isOnline]);

  const discardFailedMutation = useCallback(async (id: number) => {
    await discardMutation(id);
  }, []);

  const getFailedMutations = useCallback(async () => {
    const all = await getAllMutations();
    return all.filter((m) => m.status === "failed");
  }, []);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        syncState,
        triggerSync,
        retryFailedMutations,
        discardFailedMutation,
        getFailedMutations,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return ctx;
}
