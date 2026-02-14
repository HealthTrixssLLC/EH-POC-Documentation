const DB_NAME = "easyhealth-offline";
const DB_VERSION = 1;

const STORE_CACHE = "apiCache";
const STORE_QUEUE = "mutationQueue";
const STORE_BLOBS = "blobStore";

export interface CachedResponse {
  url: string;
  data: unknown;
  headers?: Record<string, string>;
  cachedAt: number;
  visitId?: string;
}

export interface QueuedMutation {
  id?: number;
  method: string;
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  visitId?: string;
  entityType?: string;
  createdAt: number;
  retryCount: number;
  status: "pending" | "syncing" | "failed" | "completed";
  errorMessage?: string;
}

export interface StoredBlob {
  id: string;
  blob: Blob;
  mimeType: string;
  fileName?: string;
  visitId?: string;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: "url" });
      }

      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const queueStore = db.createObjectStore(STORE_QUEUE, {
          keyPath: "id",
          autoIncrement: true,
        });
        queueStore.createIndex("status", "status", { unique: false });
        queueStore.createIndex("visitId", "visitId", { unique: false });
        queueStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

function tx(
  storeName: string,
  mode: IDBTransactionMode = "readonly",
): Promise<{ store: IDBObjectStore; tx: IDBTransaction }> {
  return openDB().then((db) => {
    const transaction = db.transaction(storeName, mode);
    return { store: transaction.objectStore(storeName), tx: transaction };
  });
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheApiResponse(
  url: string,
  data: unknown,
  visitId?: string,
): Promise<void> {
  const { store } = await tx(STORE_CACHE, "readwrite");
  const entry: CachedResponse = { url, data, cachedAt: Date.now(), visitId };
  await req(store.put(entry));
}

export async function getCachedResponse(
  url: string,
): Promise<CachedResponse | undefined> {
  const { store } = await tx(STORE_CACHE);
  return req(store.get(url));
}

export async function clearCacheForVisit(visitId: string): Promise<void> {
  const { store } = await tx(STORE_CACHE, "readwrite");
  const allKeys = await req(store.getAllKeys());
  const allValues = await req(store.getAll());
  for (let i = 0; i < allValues.length; i++) {
    const entry = allValues[i] as CachedResponse;
    if (entry.visitId === visitId) {
      store.delete(allKeys[i]);
    }
  }
}

export async function clearAllCache(): Promise<void> {
  const { store } = await tx(STORE_CACHE, "readwrite");
  await req(store.clear());
}

export async function enqueueMutation(
  mutation: Omit<QueuedMutation, "id" | "createdAt" | "retryCount" | "status">,
): Promise<number> {
  const { store } = await tx(STORE_QUEUE, "readwrite");
  const entry: Omit<QueuedMutation, "id"> = {
    ...mutation,
    createdAt: Date.now(),
    retryCount: 0,
    status: "pending",
  };
  return req(store.add(entry)) as Promise<number>;
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  const { store } = await tx(STORE_QUEUE);
  const index = store.index("status");
  return req(index.getAll("pending"));
}

export async function getAllMutations(): Promise<QueuedMutation[]> {
  const { store } = await tx(STORE_QUEUE);
  const all = await req(store.getAll());
  return (all as QueuedMutation[]).sort(
    (a, b) => a.createdAt - b.createdAt,
  );
}

export async function updateMutationStatus(
  id: number,
  status: QueuedMutation["status"],
  errorMessage?: string,
): Promise<void> {
  const { store } = await tx(STORE_QUEUE, "readwrite");
  const existing = (await req(store.get(id))) as QueuedMutation | undefined;
  if (!existing) return;
  existing.status = status;
  if (status === "failed") {
    existing.retryCount = (existing.retryCount || 0) + 1;
    if (errorMessage) existing.errorMessage = errorMessage;
  }
  await req(store.put(existing));
}

export async function removeMutation(id: number): Promise<void> {
  const { store } = await tx(STORE_QUEUE, "readwrite");
  await req(store.delete(id));
}

export async function clearCompletedMutations(): Promise<void> {
  const { store } = await tx(STORE_QUEUE, "readwrite");
  const index = store.index("status");
  const completed = (await req(
    index.getAll("completed"),
  )) as QueuedMutation[];
  for (const m of completed) {
    if (m.id != null) store.delete(m.id);
  }
}

export async function getQueueCount(): Promise<number> {
  const { store } = await tx(STORE_QUEUE);
  const index = store.index("status");
  return req(index.count("pending"));
}

export async function storeBlob(entry: StoredBlob): Promise<void> {
  const { store } = await tx(STORE_BLOBS, "readwrite");
  await req(store.put(entry));
}

export async function getBlob(id: string): Promise<StoredBlob | undefined> {
  const { store } = await tx(STORE_BLOBS);
  return req(store.get(id));
}

export async function removeBlob(id: string): Promise<void> {
  const { store } = await tx(STORE_BLOBS, "readwrite");
  await req(store.delete(id));
}

export async function getAllBlobs(): Promise<StoredBlob[]> {
  const { store } = await tx(STORE_BLOBS);
  return req(store.getAll());
}
