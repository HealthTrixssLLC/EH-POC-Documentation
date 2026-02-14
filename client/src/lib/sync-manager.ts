import {
  getPendingMutations,
  getAllMutations,
  updateMutationStatus,
  removeMutation,
  clearCompletedMutations,
  getQueueCount,
  type QueuedMutation,
} from "./offline-db";
import { resolveUrl, isCapacitorNative } from "./queryClient";

export type SyncStatus = "idle" | "syncing" | "error";

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: number | null;
  failedCount: number;
  currentItem?: string;
}

type SyncListener = (state: SyncState) => void;

const MAX_RETRIES = 3;
let syncInProgress = false;
let listeners: SyncListener[] = [];

let currentState: SyncState = {
  status: "idle",
  pendingCount: 0,
  lastSyncAt: null,
  failedCount: 0,
};

function notify(partial: Partial<SyncState>) {
  currentState = { ...currentState, ...partial };
  listeners.forEach((fn) => fn(currentState));
}

export function subscribeSyncState(fn: SyncListener): () => void {
  listeners.push(fn);
  fn(currentState);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function getSyncState(): SyncState {
  return currentState;
}

async function computeCounts(): Promise<{ pendingCount: number; failedCount: number }> {
  const allMuts = await getAllMutations();
  const pendingCount = allMuts.filter((m) => m.status === "pending" || m.status === "syncing").length;
  const failedCount = allMuts.filter((m) => m.status === "failed").length;
  return { pendingCount, failedCount };
}

export async function refreshPendingCount(): Promise<number> {
  const { pendingCount, failedCount } = await computeCounts();
  notify({ pendingCount, failedCount });
  return pendingCount;
}

function getAuthHeaders(): Record<string, string> {
  try {
    const stored = localStorage.getItem("feh_user");
    if (stored) {
      const user = JSON.parse(stored);
      return {
        "x-user-id": user.id || "",
        "x-user-name": user.fullName || "",
        "x-user-role": user.role || "",
      };
    }
  } catch {}
  return {};
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof DOMException && err.name === "AbortError") return true;
  const msg = err instanceof Error ? err.message : "";
  return msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Load failed");
}

async function incrementRetryCount(mutation: QueuedMutation): Promise<number> {
  const newCount = (mutation.retryCount || 0) + 1;
  const allMuts = await getAllMutations();
  const current = allMuts.find((m) => m.id === mutation.id);
  if (current) {
    current.retryCount = newCount;
  }
  return newCount;
}

async function replayMutation(mutation: QueuedMutation): Promise<boolean> {
  const retries = await incrementRetryCount(mutation);

  try {
    const headers: Record<string, string> = {
      ...getAuthHeaders(),
      ...(mutation.headers || {}),
    };
    if (mutation.body) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(resolveUrl(mutation.url), {
      method: mutation.method,
      headers,
      body: mutation.body ? JSON.stringify(mutation.body) : undefined,
      credentials: isCapacitorNative() ? "omit" : "include",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      await removeMutation(mutation.id!);
      return true;
    }

    if (response.status === 409) {
      await updateMutationStatus(
        mutation.id!,
        "failed",
        "Conflict: data was modified on the server. Your changes may need to be re-applied.",
      );
      return false;
    }

    if (response.status >= 400 && response.status < 500) {
      const text = await response.text().catch(() => "");
      await updateMutationStatus(
        mutation.id!,
        "failed",
        `Server rejected: ${response.status} - ${text.substring(0, 200)}`,
      );
      return false;
    }

    if (retries >= MAX_RETRIES) {
      await updateMutationStatus(mutation.id!, "failed", `Server error (${response.status}) after ${retries} retries`);
    } else {
      await updateMutationStatus(mutation.id!, "pending", `Server error (${response.status}), will retry`);
    }
    return false;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";

    if (isNetworkError(err) || !navigator.onLine) {
      if (retries >= MAX_RETRIES) {
        await updateMutationStatus(mutation.id!, "failed", `Network error after ${retries} retries: ${msg}`);
      } else {
        await updateMutationStatus(mutation.id!, "pending", `Network error, will retry: ${msg}`);
      }
      return false;
    }

    await updateMutationStatus(mutation.id!, "failed", msg);
    return false;
  }
}

export async function syncAll(): Promise<SyncState> {
  if (syncInProgress) return currentState;
  if (!navigator.onLine) {
    const counts = await computeCounts();
    notify({ status: counts.failedCount > 0 ? "error" : "idle", ...counts });
    return currentState;
  }

  syncInProgress = true;
  notify({ status: "syncing" });

  try {
    const pending = await getPendingMutations();

    for (const mutation of pending) {
      if (!navigator.onLine) break;

      const description = `${mutation.method} ${mutation.url}`;
      notify({ currentItem: description });

      await updateMutationStatus(mutation.id!, "syncing");
      await replayMutation(mutation);
    }

    await clearCompletedMutations();
    const counts = await computeCounts();

    notify({
      status: counts.failedCount > 0 ? "error" : "idle",
      ...counts,
      lastSyncAt: Date.now(),
      currentItem: undefined,
    });
  } catch {
    const counts = await computeCounts().catch(() => ({ pendingCount: 0, failedCount: 0 }));
    notify({ status: "error", currentItem: undefined, ...counts });
  } finally {
    syncInProgress = false;
  }

  return currentState;
}

export async function retryFailed(): Promise<void> {
  const allMuts = await getAllMutations();
  const failed = allMuts.filter((m) => m.status === "failed");
  for (const m of failed) {
    if (m.id != null) {
      await updateMutationStatus(m.id, "pending");
    }
  }
  await syncAll();
}

export async function discardMutation(id: number): Promise<void> {
  await removeMutation(id);
  await refreshPendingCount();
}
