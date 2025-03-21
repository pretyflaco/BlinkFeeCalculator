import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Define price types based on the Blink API response
interface BitcoinPriceData {
  base: number;
  offset: number;
  currencyUnit: string;
  formattedAmount: string;
}

interface PriceListItem {
  timestamp: number;
  price: BitcoinPriceData;
}

interface BitcoinPriceResponse {
  data: {
    btcPriceList: PriceListItem[];
  };
}

// Convert price to USD (base is in USDCENT with offset)
const convertToUSD = (price: BitcoinPriceData): number => {
  // base is the price in USDCENT with an offset
  // For example: base = 27085000000, offset = 4 means 27085000000 / 10^4 = 2708500 cents = $27,085
  return price.base / Math.pow(10, price.offset) / 100; // Convert cents to dollars
};

// Function to fetch price data from Blink API
const fetchBitcoinPrice = async (): Promise<number> => {
  try {
    // GraphQL query for bitcoin price
    const query = `
      query btcPriceList($range: PriceGraphRange!) {
        btcPriceList(range: $range) {
          timestamp
          price {
            base
            offset
            currencyUnit
            formattedAmount
          }
        }
      }
    `;

    // Call the Blink API with GraphQL query
    const response = await fetch('https://api.blink.sv/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { range: 'ONE_DAY' },
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data: BitcoinPriceResponse = await response.json();
    
    // Get the most recent price from the list
    if (data.data?.btcPriceList && data.data.btcPriceList.length > 0) {
      // Sort by timestamp descending and get the most recent price
      const mostRecent = [...data.data.btcPriceList].sort((a, b) => b.timestamp - a.timestamp)[0];
      return convertToUSD(mostRecent.price);
    }
    
    throw new Error('No price data available');
  } catch (error) {
    console.error('Error fetching Bitcoin price:', error);
    throw error;
  }
};

// Custom hook to get current Bitcoin price
export function useBitcoinPrice() {
  return useQuery({
    queryKey: ['bitcoinPrice'],
    queryFn: fetchBitcoinPrice,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });
}