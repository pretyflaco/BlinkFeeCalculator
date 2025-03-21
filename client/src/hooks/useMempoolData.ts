import { useQuery } from "@tanstack/react-query";
import { MempoolFee } from "@shared/schema";

export function useMempoolData() {
  return useQuery<MempoolFee>({
    queryKey: ['/api/fees/recommended'],
    staleTime: 60000, // Consider data stale after 1 minute
    refetchOnWindowFocus: true,
    retry: 3,
  });
}
