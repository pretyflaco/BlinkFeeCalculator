import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiKey } from "@/lib/apiKeyStorage";

// Constants for API key names
export const MEMPOOL_API_KEY = "mempool_api_key";
export const BTC_PRICE_API_KEY = "btc_price_api_key";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Adds appropriate API keys to headers based on the URL
 * @param url The request URL
 * @param headers Existing headers object
 * @returns Headers with API keys added as appropriate
 */
function addApiKeysToHeaders(url: string, headers: HeadersInit = {}): HeadersInit {
  // Convert headers to a Record<string, string> for easier manipulation
  const headersObj: Record<string, string> = { 
    ...(headers instanceof Headers 
      ? Object.fromEntries(headers.entries()) 
      : Array.isArray(headers) 
        ? Object.fromEntries(headers) 
        : headers)
  };

  // Add Mempool API key if the request is to mempool.space
  if (url.includes('mempool.space') || url.includes('/api/fees')) {
    const mempoolApiKey = getApiKey(MEMPOOL_API_KEY);
    if (mempoolApiKey) {
      headersObj['Authorization'] = `Bearer ${mempoolApiKey}`;
    }
  }

  // Add BTC price API key if the request is to the price API
  if (url.includes('api.example.com/btc/price') || url.includes('/api/btc-price')) {
    const btcPriceApiKey = getApiKey(BTC_PRICE_API_KEY);
    if (btcPriceApiKey) {
      headersObj['X-API-Key'] = btcPriceApiKey;
    }
  }

  return headersObj;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Start with basic headers
  let headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  
  // Add API keys based on the URL
  headers = addApiKeysToHeaders(url, headers);

  const res = await fetch(url, {
    method,
    headers,
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
    const url = queryKey[0] as string;
    
    // Add API keys based on the URL
    const headers = addApiKeysToHeaders(url);

    const res = await fetch(url, {
      credentials: "include",
      headers
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
