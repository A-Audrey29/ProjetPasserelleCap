import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Global maintenance state
let maintenanceCallback: ((message: string) => void) | null = null;

export function setMaintenanceCallback(callback: (message: string) => void) {
  maintenanceCallback = callback;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle maintenance mode (503)
    if (res.status === 503) {
      try {
        const data = await res.json();
        if (maintenanceCallback && data.message) {
          maintenanceCallback(data.message);
        }
      } catch {
        if (maintenanceCallback) {
          maintenanceCallback('La plateforme est temporairement en maintenance.');
        }
      }
      throw new Error('Maintenance en cours');
    }

    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
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
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
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
