import { useState, useEffect } from "react";
import { WifiOff, RefreshCw, CloudOff, Check, AlertTriangle, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNetwork } from "@/lib/network-context";
import type { QueuedMutation } from "@/lib/offline-db";

export function OfflineBanner() {
  const { isOnline, syncState, triggerSync, retryFailedMutations, discardFailedMutation, getFailedMutations } = useNetwork();
  const [expanded, setExpanded] = useState(false);
  const [failedItems, setFailedItems] = useState<QueuedMutation[]>([]);
  const [justCameOnline, setJustCameOnline] = useState(false);

  useEffect(() => {
    if (isOnline && syncState.pendingCount === 0 && syncState.status === "idle" && syncState.lastSyncAt) {
      setJustCameOnline(true);
      const timer = setTimeout(() => setJustCameOnline(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, syncState.pendingCount, syncState.status, syncState.lastSyncAt]);

  useEffect(() => {
    if (expanded && syncState.failedCount > 0) {
      getFailedMutations().then(setFailedItems);
    }
  }, [expanded, syncState.failedCount, getFailedMutations]);

  const showBanner = !isOnline || syncState.pendingCount > 0 || syncState.status === "syncing" || syncState.failedCount > 0 || justCameOnline;

  if (!showBanner) return null;

  const handleDiscard = async (id: number) => {
    await discardFailedMutation(id);
    const updated = failedItems.filter((f) => f.id !== id);
    setFailedItems(updated);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]" data-testid="offline-banner-container">
      {!isOnline && (
        <div
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "#E74C3C" }}
          data-testid="banner-offline"
        >
          <WifiOff className="w-4 h-4" />
          <span>You are offline. Changes will be saved locally and synced when connection returns.</span>
          {syncState.pendingCount > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs no-default-hover-elevate" data-testid="badge-queued-count">
              {syncState.pendingCount} queued
            </Badge>
          )}
        </div>
      )}

      {isOnline && syncState.status === "syncing" && (
        <div
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "#277493" }}
          data-testid="banner-syncing"
        >
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Syncing offline changes... {syncState.currentItem && `(${syncState.currentItem})`}</span>
        </div>
      )}

      {isOnline && syncState.status === "idle" && syncState.pendingCount > 0 && (
        <div
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "#E8913A" }}
          data-testid="banner-pending"
        >
          <CloudOff className="w-4 h-4" />
          <span>{syncState.pendingCount} change{syncState.pendingCount > 1 ? "s" : ""} waiting to sync</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => triggerSync()}
            className="ml-2"
            data-testid="button-sync-now"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Sync Now
          </Button>
        </div>
      )}

      {justCameOnline && syncState.pendingCount === 0 && syncState.failedCount === 0 && (
        <div
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "#277493" }}
          data-testid="banner-synced"
        >
          <Check className="w-4 h-4" />
          <span>Back online. All changes synced successfully.</span>
        </div>
      )}

      {isOnline && syncState.failedCount > 0 && (
        <div data-testid="banner-failed">
          <div
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white cursor-pointer"
            style={{ backgroundColor: "#E8913A" }}
            onClick={() => setExpanded(!expanded)}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{syncState.failedCount} change{syncState.failedCount > 1 ? "s" : ""} failed to sync</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                retryFailedMutations();
              }}
              className="ml-2"
              data-testid="button-retry-failed"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Retry All
            </Button>
            {expanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </div>
          {expanded && failedItems.length > 0 && (
            <div className="bg-background border-b shadow-md max-h-48 overflow-y-auto">
              {failedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm border-b last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">{item.method}</span>{" "}
                    <span className="text-xs truncate">{item.url}</span>
                    {item.errorMessage && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.errorMessage}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDiscard(item.id!)}
                    data-testid={`button-discard-mutation-${item.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
