import { QueryClient, QueryFunction } from "@tanstack/react-query";
import {
  cacheApiResponse,
  getCachedResponse,
  enqueueMutation,
} from "./offline-db";
import { refreshPendingCount } from "./sync-manager";

const PRODUCTION_API_URL = "https://eh-poc-application.healthtrixss.com";

export function isCapacitorNative(): boolean {
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

function getApiBase(): string {
  if (isCapacitorNative()) {
    const configured = import.meta.env.VITE_API_BASE_URL;
    if (configured) return configured.replace(/\/$/, "");
    return PRODUCTION_API_URL;
  }
  return "";
}

export function resolveUrl(path: string): string {
  const base = getApiBase();
  if (base && path.startsWith("/")) {
    return base + path;
  }
  return path;
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

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function extractVisitId(url: string): string | undefined {
  const match = url.match(/\/api\/visits\/([^/]+)/);
  return match?.[1];
}

function shouldCacheUrl(url: string): boolean {
  if (!url.startsWith("/api/")) return false;
  const noCachePaths = [
    "/api/demo/reset",
    "/api/fhir/",
    "/api/audit-",
    "/api/ai-providers",
  ];
  return !noCachePaths.some((p) => url.includes(p));
}

function isOfflineSafeMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  try {
    const res = await fetch(resolveUrl(url), {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: isCapacitorNative() ? "omit" : "include",
    });

    await throwIfResNotOk(res);

    if (method.toUpperCase() === "GET" && shouldCacheUrl(url)) {
      try {
        const cloned = res.clone();
        const json = await cloned.json();
        cacheApiResponse(url, json, extractVisitId(url));
      } catch {}
    }

    return res;
  } catch (err) {
    const isNetworkErr = err instanceof TypeError ||
      (err instanceof Error && (
        err.message.includes("Failed to fetch") ||
        err.message.includes("NetworkError") ||
        err.message.includes("Load failed")
      ));
    const effectivelyOffline = !navigator.onLine || isNetworkErr;

    if (effectivelyOffline && isOfflineSafeMethod(method)) {
      await enqueueMutation({
        method: method.toUpperCase(),
        url,
        body: data,
        headers,
        visitId: extractVisitId(url),
        entityType: url.split("/").pop() || "unknown",
      });
      await refreshPendingCount();

      const offlineResponse = new Response(
        JSON.stringify({
          offline: true,
          queued: true,
          message: "Saved offline. Will sync when connection is restored.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
      return offlineResponse;
    }

    if (
      effectivelyOffline &&
      method.toUpperCase() === "GET" &&
      shouldCacheUrl(url)
    ) {
      const cached = await getCachedResponse(url);
      if (cached) {
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Offline-Cache": "true",
            "X-Cached-At": String(cached.cachedAt),
          },
        });
      }
    }

    throw err;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const rawUrl = queryKey.join("/") as string;

    try {
      const res = await fetch(resolveUrl(rawUrl), {
        credentials: isCapacitorNative() ? "omit" : "include",
        headers: getAuthHeaders(),
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();

      if (shouldCacheUrl(rawUrl)) {
        try {
          cacheApiResponse(rawUrl, data, extractVisitId(rawUrl));
        } catch {}
      }

      return data;
    } catch (err) {
      const isNetworkErr = err instanceof TypeError ||
        (err instanceof Error && (
          err.message.includes("Failed to fetch") ||
          err.message.includes("NetworkError") ||
          err.message.includes("Load failed")
        ));
      const effectivelyOffline = !navigator.onLine || isNetworkErr;

      if (effectivelyOffline && shouldCacheUrl(rawUrl)) {
        const cached = await getCachedResponse(rawUrl);
        if (cached) {
          return cached.data as Awaited<ReturnType<QueryFunction>>;
        }
      }
      throw err;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
