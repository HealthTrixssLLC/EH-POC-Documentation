import { QueryClient, QueryFunction } from "@tanstack/react-query";

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

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(data ? { "Content-Type": "application/json" } : {}),
  };
  const res = await fetch(resolveUrl(url), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: isCapacitorNative() ? "omit" : "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const rawUrl = queryKey.join("/") as string;
    const res = await fetch(resolveUrl(rawUrl), {
      credentials: isCapacitorNative() ? "omit" : "include",
      headers: getAuthHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
