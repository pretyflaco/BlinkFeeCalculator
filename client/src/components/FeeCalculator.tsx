import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useMempoolData } from "@/hooks/useMempoolData";
import { useBitcoinPrice } from "@/hooks/useBitcoinPrice";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Info, Bitcoin, Check, Loader2 } from "lucide-react";

// Transaction size components for P2WPKH
const BASE_SIZE = 11; // bytes
const P2WPKH_INPUT_SIZE = 68; // bytes
const P2WPKH_OUTPUT_SIZE = 31; // bytes

type FeePreference = 'fastestFee' | 'hourFee' | 'economyFee';

export default function FeeCalculator() {
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [selectedFeeType, setSelectedFeeType] = useState<FeePreference>('fastestFee');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isSatsMode, setIsSatsMode] = useState<boolean>(false);
  const { data: mempoolData, isLoading: mempoolLoading, isError: mempoolError, error: mempoolErrorData, refetch: refetchMempool } = useMempoolData();
  const { data: btcPrice, isLoading: priceLoading, isError: priceError, error: priceErrorData } = useBitcoinPrice();
  const { toast } = useToast();
  
  // Loading and error states combined for both APIs
  const isLoading = mempoolLoading || priceLoading;
  const isError = mempoolError || priceError;
  const error = mempoolError ? mempoolErrorData : priceErrorData;

  useEffect(() => {
    if (mempoolData) {
      updateLastUpdated();
    }
  }, [mempoolData]);

  // Set up periodic refresh (every 2 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      refetchMempool();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [refetchMempool]);

  // Update the last updated timestamp
  const updateLastUpdated = () => {
    const now = new Date();
    const formattedDate = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastUpdated(`Last updated: ${formattedDate}`);
  };

  // Convert BTC to satoshis
  const btcToSats = (btc: string): number => {
    if (!btc || btc === '') return 0;
    return Math.round(parseFloat(btc) * 100000000);
  };

  // Convert satoshis to BTC
  const satsToBtc = (sats: number): string => {
    return (sats / 100000000).toFixed(8);
  };

  // Get payment amount in satoshis regardless of input mode
  const getPaymentAmountSats = (): number => {
    if (!paymentAmount || paymentAmount === '') return 0;
    return isSatsMode ? parseInt(paymentAmount, 10) : btcToSats(paymentAmount);
  };

  // Get the number of inputs based on payment amount in satoshis
  const getNumberOfInputs = (amountSats: number): number => {
    if (amountSats < 1) return 0;
    if (amountSats < 500000) return 1;
    if (amountSats < 3000000) return 2;
    if (amountSats < 10000000) return 3;
    if (amountSats < 22000000) return 4;
    if (amountSats < 70000000) return 5;
    return 6;
  };

  // Calculate the transaction size in vbytes
  const calculateTransactionSize = (numInputs: number): number => {
    const numOutputs = 2; // Always 2 outputs as per requirements
    return BASE_SIZE + (numInputs * P2WPKH_INPUT_SIZE) + (numOutputs * P2WPKH_OUTPUT_SIZE);
  };

  // Calculate exponential decay for fee percentage calculations
  const calculateExpDecay = (
    paymentAmountSats: number, 
    minRate: number, 
    maxRate: number, 
    constDivisor: number
  ): number => {
    if (paymentAmountSats < 4000000) {
      return minRate + (maxRate - minRate) * Math.exp(-((paymentAmountSats - 21000) / (4000000 - 21000)) * 21);
    } else {
      return constDivisor / paymentAmountSats;
    }
  };

  // Calculate base fee multiplier
  const calculateBaseMultiplier = (feeType: FeePreference): number => {
    if (!mempoolData) return 0;
    
    switch (feeType) {
      case 'fastestFee': // Priority
        return (2 / mempoolData.fastestFee) + 1.3;
      case 'hourFee': // Standard
        return (1 / mempoolData.hourFee) + 1.1;
      case 'economyFee': // Slow
        return (2 / mempoolData.economyFee) + 1.1;
      default:
        return 0;
    }
  };

  // Calculate fee percentage based on fee preference
  const calculateFeePercentage = (paymentAmountSats: number, feeType: FeePreference): number => {
    if (!mempoolData || paymentAmountSats === 0) return 0;
    
    switch (feeType) {
      case 'fastestFee': { // Priority
        const expDecay = calculateExpDecay(paymentAmountSats, 0.01, 0.04, 40000);
        return expDecay + ((mempoolData.fastestFee - 1) / (2000 - 1)) * (0.005 - expDecay);
      }
      case 'hourFee': { // Standard
        const expDecay = calculateExpDecay(paymentAmountSats, 0.00625, 0.03, 25000);
        return expDecay + ((mempoolData.hourFee - 1) / (2000 - 1)) * (0.0025 - expDecay);
      }
      case 'economyFee': { // Slow
        const expDecay = calculateExpDecay(paymentAmountSats, 0.00375, 0.02, 15000);
        return expDecay + ((mempoolData.economyFee - 1) / (2000 - 1)) * (0.001 - expDecay);
      }
      default:
        return 0;
    }
  };

  // Calculate the Blink fee
  const calculateBlinkFee = (): { feeSats: number; feeBTC: number; feeUSD: number; transactionSize: number } | null => {
    if (!mempoolData || !btcPrice) return null;

    const paymentAmountSats = getPaymentAmountSats();
    if (paymentAmountSats === 0) return null;

    const numInputs = getNumberOfInputs(paymentAmountSats);
    const transactionSize = calculateTransactionSize(numInputs);
    const paymentCostToBank = transactionSize;
    
    const feePercentage = calculateFeePercentage(paymentAmountSats, selectedFeeType);
    const baseMultiplier = calculateBaseMultiplier(selectedFeeType);
    
    // Calculate fee using the formula
    const feeSats = Math.round(
      (paymentAmountSats * feePercentage) + (paymentCostToBank * baseMultiplier)
    );
    
    const feeBTC = feeSats / 100000000;
    const feeUSD = feeBTC * btcPrice; // Use real-time Bitcoin price from API

    return { feeSats, feeBTC, feeUSD, transactionSize };
  };

  // Get fee calculation result
  const feeCalculation = calculateBlinkFee();

  // Handle fee preference button click
  const handleFeePreferenceChange = (preference: FeePreference) => {
    setSelectedFeeType(preference);
  };

  // Get the display name for the fee type
  const getFeeTypeName = (feeType: FeePreference): string => {
    switch (feeType) {
      case 'fastestFee': return 'Priority';
      case 'hourFee': return 'Standard';
      case 'economyFee': return 'Slow';
      default: return 'Custom';
    }
  };

  // Get the badge color based on fee type
  const getFeeBadgeVariant = (feeType: FeePreference): "default" | "secondary" | "destructive" => {
    switch (feeType) {
      case 'fastestFee': return "default";
      case 'hourFee': return "secondary";
      case 'economyFee': return "destructive";
      default: return "default";
    }
  };

  // Retry loading mempool data and price data
  const handleRetry = () => {
    toast({
      title: "Retrying...",
      description: "Fetching latest data",
    });
    refetchMempool();
  };

  // Handle input change
  const handlePaymentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === '') {
      setPaymentAmount('');
      return;
    }
    
    // Allow valid numeric input
    const value = e.target.value;
    if (!isNaN(parseFloat(value)) && isFinite(Number(value))) {
      setPaymentAmount(value);
    }
  };

  // Handle the unit toggle switch change
  const handleUnitToggleChange = () => {
    // If we have a value, convert it between units
    if (paymentAmount) {
      if (isSatsMode) {
        // Converting from sats to BTC
        const satsValue = parseInt(paymentAmount, 10);
        setPaymentAmount(satsToBtc(satsValue));
      } else {
        // Converting from BTC to sats
        const btcValue = parseFloat(paymentAmount);
        setPaymentAmount(Math.round(btcValue * 100000000).toString());
      }
    }
    
    // Toggle the mode
    setIsSatsMode(!isSatsMode);
  };

  // Get input placeholder based on current mode
  const getInputPlaceholder = (): string => {
    return isSatsMode ? "1000000" : "0.00123456";
  };

  // Get unit label for input field
  const getUnitLabel = (): string => {
    return isSatsMode ? "sats" : "BTC";
  };

  // Calculate dynamic info text based on payment amount
  const getTransactionInfoText = (): string => {
    const paymentAmountSats = getPaymentAmountSats();
    if (paymentAmountSats === 0) return 'Enter a payment amount to see transaction details';
    
    const numInputs = getNumberOfInputs(paymentAmountSats);
    const numOutputs = 2;
    const transactionSize = calculateTransactionSize(numInputs);
    
    return `This calculation uses ${numInputs} ${numInputs === 1 ? 'input' : 'inputs'} and ${numOutputs} outputs (${transactionSize} vbytes) based on your payment amount.`;
  };

  // Display equivalent amount in opposite unit
  const getEquivalentAmount = (): string => {
    if (!paymentAmount) return '';
    
    if (isSatsMode) {
      // Show BTC equivalent
      const satsValue = parseInt(paymentAmount, 10);
      return `= ${satsToBtc(satsValue)} BTC`;
    } else {
      // Show sats equivalent
      return `= ${btcToSats(paymentAmount).toLocaleString()} sats`;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-md">
        <CardContent className="p-6 md:p-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="payment-amount" className="text-sm font-medium">
                Payment Amount ({isSatsMode ? 'sats' : 'BTC'})
              </Label>
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
            
            {/* Unit toggle */}
            <div className="flex items-center justify-end space-x-2 mb-2">
              <span className="text-xs text-gray-500">BTC</span>
              <Switch
                checked={isSatsMode}
                onCheckedChange={handleUnitToggleChange}
                aria-label="Toggle between BTC and satoshi units"
              />
              <span className="text-xs text-gray-500">sats</span>
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Bitcoin className="h-5 w-5 text-orange-500" />
              </div>
              <Input
                type="number"
                id="payment-amount"
                value={paymentAmount}
                onChange={handlePaymentAmountChange}
                placeholder={getInputPlaceholder()}
                className="pl-10 pr-12"
                step={isSatsMode ? "1" : "0.00000001"}
                min="0"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500">{getUnitLabel()}</span>
              </div>
            </div>
            
            {paymentAmount && (
              <p className="mt-2 text-sm text-gray-500">
                {getEquivalentAmount()}
              </p>
            )}
            <p className="mt-2 text-sm text-gray-500">Enter the amount you want to send through Blink.</p>
          </div>

          {/* Fee Results Card */}
          <div className="bg-gray-50 rounded-lg p-5 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Blink Fee</h3>
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
                {paymentAmount && feeCalculation ? (
                  <span className="font-medium">{feeCalculation.transactionSize} vbytes</span>
                ) : (
                  <span className="font-medium text-gray-400">--</span>
                )}
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
                <span className="text-gray-600">Blink Fee:</span>
                {isLoading ? (
                  <span className="font-medium flex items-center">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin text-orange-500" />
                    Loading...
                  </span>
                ) : feeCalculation ? (
                  <span className="font-medium">
                    {feeCalculation.feeSats.toLocaleString()} sats
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
                Priority
              </Button>
              <Button
                variant={selectedFeeType === 'hourFee' ? 'default' : 'outline'}
                onClick={() => handleFeePreferenceChange('hourFee')}
                className="col-span-1"
              >
                Standard
              </Button>
              <Button
                variant={selectedFeeType === 'economyFee' ? 'default' : 'outline'}
                onClick={() => handleFeePreferenceChange('economyFee')}
                className="col-span-1"
              >
                Slow
              </Button>
            </div>
          </div>

          {/* Additional Information */}
          <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
            <div className="flex items-start mb-2">
              <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
              <p>
                {getTransactionInfoText()}
                {' '}Fees are estimated based on current mempool conditions.
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
