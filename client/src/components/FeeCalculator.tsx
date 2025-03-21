import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useMempoolData } from "@/hooks/useMempoolData";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Info, Bitcoin, Check, Loader2 } from "lucide-react";

// Constants for the fee calculation
const TRANSACTION_SIZE = 209; // vbytes (2 PWPKH inputs and 2 PWPKH outputs)
const BTC_USD_PRICE = 43000; // Placeholder BTC price in USD

type FeePreference = 'fastestFee' | 'halfHourFee' | 'hourFee';

export default function FeeCalculator() {
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [selectedFeeType, setSelectedFeeType] = useState<FeePreference>('fastestFee');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const { data: mempoolData, isLoading, isError, error, refetch } = useMempoolData();
  const { toast } = useToast();

  useEffect(() => {
    if (mempoolData) {
      updateLastUpdated();
    }
  }, [mempoolData]);

  // Set up periodic refresh (every 2 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [refetch]);

  // Update the last updated timestamp
  const updateLastUpdated = () => {
    const now = new Date();
    const formattedDate = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastUpdated(`Last updated: ${formattedDate}`);
  };

  // Format a number of satoshis to BTC
  const formatSatsToBTC = (sats: number): string => {
    const btc = sats / 100000000;
    return btc.toFixed(8);
  };

  // Calculate the transaction fee
  const calculateFee = (): { feeSats: number; feeBTC: number; feeUSD: number } | null => {
    if (!mempoolData) return null;

    const feeRate = mempoolData[selectedFeeType];
    const feeSats = TRANSACTION_SIZE * feeRate;
    const feeBTC = feeSats / 100000000;
    const feeUSD = feeBTC * BTC_USD_PRICE;

    return { feeSats, feeBTC, feeUSD };
  };

  // Get fee calculation result
  const feeCalculation = calculateFee();

  // Handle fee preference button click
  const handleFeePreferenceChange = (preference: FeePreference) => {
    setSelectedFeeType(preference);
  };

  // Get the display name for the fee type
  const getFeeTypeName = (feeType: FeePreference): string => {
    switch (feeType) {
      case 'fastestFee': return 'Fastest';
      case 'halfHourFee': return 'Half Hour';
      case 'hourFee': return 'Hour';
      default: return 'Custom';
    }
  };

  // Get the badge color based on fee type
  const getFeeBadgeVariant = (feeType: FeePreference): "default" | "secondary" | "destructive" => {
    switch (feeType) {
      case 'fastestFee': return "default";
      case 'halfHourFee': return "secondary";
      case 'hourFee': return "destructive";
      default: return "default";
    }
  };

  // Retry loading mempool data
  const handleRetry = () => {
    toast({
      title: "Retrying...",
      description: "Fetching latest mempool data",
    });
    refetch();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-md">
        <CardContent className="p-6 md:p-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="payment-amount" className="text-sm font-medium">Payment Amount (BTC)</Label>
              <div className="text-xs text-gray-500">
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    <span>Loading mempool data...</span>
                  </div>
                ) : isError ? (
                  <div className="flex items-center text-destructive">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    <span>Failed to load data</span>
                  </div>
                ) : (
                  <div className="flex items-center text-green-600">
                    <Check className="mr-1 h-3 w-3" />
                    <span>Mempool data loaded</span>
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Bitcoin className="h-5 w-5 text-orange-500" />
              </div>
              <Input
                type="number"
                id="payment-amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00123456"
                className="pl-10 pr-12"
                step="0.00000001"
                min="0"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500">BTC</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">Enter the amount you want to send through Blink.</p>
          </div>

          {/* Fee Results Card */}
          <div className="bg-gray-50 rounded-lg p-5 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Fee Calculation</h3>
              {mempoolData && (
                <Badge variant={getFeeBadgeVariant(selectedFeeType)}>
                  {getFeeTypeName(selectedFeeType)}
                </Badge>
              )}
            </div>

            {/* Results Details */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Transaction Size:</span>
                <span className="font-medium">{TRANSACTION_SIZE} vbytes</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Current Fee Rate:</span>
                {isLoading ? (
                  <span className="font-medium flex items-center">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin text-orange-500" />
                    Loading...
                  </span>
                ) : mempoolData ? (
                  <span className="font-medium">{mempoolData[selectedFeeType]} sat/vB</span>
                ) : (
                  <span className="font-medium text-gray-400">--</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Estimated Fee:</span>
                {isLoading ? (
                  <span className="font-medium flex items-center">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin text-orange-500" />
                    Loading...
                  </span>
                ) : feeCalculation ? (
                  <span className="font-medium">
                    {feeCalculation.feeSats.toLocaleString()} sats ({formatSatsToBTC(feeCalculation.feeSats)} BTC)
                  </span>
                ) : (
                  <span className="font-medium text-gray-400">--</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Fee in USD:</span>
                {isLoading ? (
                  <span className="font-medium flex items-center">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin text-orange-500" />
                    Loading...
                  </span>
                ) : feeCalculation ? (
                  <span className="font-medium">${feeCalculation.feeUSD.toFixed(2)}</span>
                ) : (
                  <span className="font-medium text-gray-400">--</span>
                )}
              </div>
            </div>
          </div>

          {/* Fee Preference Buttons */}
          <div className="mb-6">
            <Label className="block text-sm font-medium mb-2">Fee Preference</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={selectedFeeType === 'fastestFee' ? 'default' : 'outline'}
                onClick={() => handleFeePreferenceChange('fastestFee')}
                className="col-span-1"
              >
                Fastest
              </Button>
              <Button
                variant={selectedFeeType === 'halfHourFee' ? 'default' : 'outline'}
                onClick={() => handleFeePreferenceChange('halfHourFee')}
                className="col-span-1"
              >
                Half Hour
              </Button>
              <Button
                variant={selectedFeeType === 'hourFee' ? 'default' : 'outline'}
                onClick={() => handleFeePreferenceChange('hourFee')}
                className="col-span-1"
              >
                Hour
              </Button>
            </div>
          </div>

          {/* Additional Information */}
          <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
            <div className="flex items-start mb-2">
              <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
              <p>
                This calculator assumes a standard transaction with 2 PWPKH inputs and 2 PWPKH outputs (209 vbyte size).
                Fees are estimated based on current mempool conditions.
              </p>
            </div>
            <div className="text-xs text-gray-500 italic mt-2">
              {lastUpdated || 'Last updated: Fetching...'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {isError && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col">
            <p className="font-medium">Error fetching mempool data</p>
            <p className="text-sm">{error instanceof Error ? error.message : 'Unable to connect to the mempool.space API'}</p>
            <Button variant="outline" size="sm" onClick={handleRetry} className="mt-2 self-start">
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
