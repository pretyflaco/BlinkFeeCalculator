import { useQuery } from "@tanstack/react-query";
import { mempoolFeeSchema, MempoolFee } from "@shared/schema";
import { getApiKey } from "@/lib/apiKeyStorage";
import { MEMPOOL_API_KEY } from "@/lib/queryClient";

// Fetch recommended fees directly from mempool.space so the app works as a
// fully static site (e.g. GitHub Pages) with no backend proxy.
const MEMPOOL_URL = "https://mempool.space/api/v1/fees/recommended";

async function fetchMempoolFees(): Promise<MempoolFee> {
  const headers: Record<string, string> = {};
  const apiKey = getApiKey(MEMPOOL_API_KEY);
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  // Note: no `credentials: "include"` — mempool.space is a public CORS endpoint.
  const res = await fetch(MEMPOOL_URL, { headers });
  if (!res.ok) {
    throw new Error(`${res.status}: ${(await res.text()) || res.statusText}`);
  }

  const data = await res.json();
  return mempoolFeeSchema.parse(data);
}

export function useMempoolData() {
  return useQuery<MempoolFee>({
    queryKey: ["mempool-fees-recommended"],
    queryFn: fetchMempoolFees,
    staleTime: 60000, // Consider data stale after 1 minute
    refetchOnWindowFocus: true,
    retry: 3,
  });
}
