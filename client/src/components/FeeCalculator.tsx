import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useMempoolData } from "@/hooks/useMempoolData";
import { useBitcoinPrice } from "@/hooks/useBitcoinPrice";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Info, Bitcoin, Check, Loader2, Sliders } from "lucide-react";
import {
  type FeePreference,
  type FeeModelConfig,
  FEE_MODELS,
  RECOMMENDED_MODEL,
  getNumberOfInputs,
  getBatchInputCount,
  calculateTransactionSize,
  calculateBlinkFee,
  calculateFlatFee,
} from "@/lib/feeModels";

// Convert fee rate to slider position (0-100)
// Uses a logarithmic scale for better user experience
const getSliderPositionFromFeeRate = (feeRate: number): number => {
  if (feeRate <= 1) return 0;
  if (feeRate >= 2000) return 100;
  
  // Use a logarithmic scale where:
  // 0% = 1 sat/vB
  // 50% = 50 sat/vB
  // 100% = 2000 sat/vB
  
  if (feeRate <= 50) {
    // Lower half of slider (1 to 50 sat/vB) - linear
    return Math.round((feeRate - 1) / (50 - 1) * 50);
  } else {
    // Upper half of slider (50 to 2000 sat/vB) - logarithmic
    const logMin = Math.log(50);
    const logMax = Math.log(2000);
    const scale = (Math.log(feeRate) - logMin) / (logMax - logMin);
    return Math.round(50 + (scale * 50));
  }
};

// Convert slider position (0-100) to fee rate
const getFeeRateFromSliderPosition = (position: number): number => {
  if (position <= 0) return 1;
  if (position >= 100) return 2000;
  
  // Use the inverse of the logarithmic scale:
  // 0% = 1 sat/vB
  // 50% = 50 sat/vB
  // 100% = 2000 sat/vB
  
  if (position <= 50) {
    // Lower half of slider (0-50%) maps to 1-50 sat/vB - linear
    const feeRate = 1 + (position / 50) * (50 - 1);
    return Math.round(feeRate);
  } else {
    // Upper half of slider (50-100%) maps to 50-2000 sat/vB - logarithmic
    const logMin = Math.log(50);
    const logMax = Math.log(2000);
    const normalizedPosition = (position - 50) / 50;
    const feeRate = Math.exp(logMin + normalizedPosition * (logMax - logMin));
    return Math.round(feeRate);
  }
};

// Convert payment amount to slider position (0-100)
// Uses a logarithmic scale
const getSliderPositionFromAmount = (amountSats: number): number => {
  if (amountSats <= 10000) return 0; // 0.0001 BTC or 10,000 sats
  if (amountSats >= 100000000) return 100; // 1 BTC or 100,000,000 sats
  
  // Use a logarithmic scale where:
  // 0% = 10,000 sats (0.0001 BTC)
  // 50% = 1,000,000 sats (0.01 BTC)
  // 100% = 100,000,000 sats (1 BTC)
  
  if (amountSats <= 1000000) {
    // Lower half of slider (10K to 1M sats) - logarithmic
    const logMin = Math.log(10000);
    const logMax = Math.log(1000000);
    const scale = (Math.log(amountSats) - logMin) / (logMax - logMin);
    return Math.round(scale * 50);
  } else {
    // Upper half of slider (1M to 100M sats) - logarithmic
    const logMin = Math.log(1000000);
    const logMax = Math.log(100000000);
    const scale = (Math.log(amountSats) - logMin) / (logMax - logMin);
    return Math.round(50 + (scale * 50));
  }
};

// Convert slider position (0-100) to payment amount
const getAmountFromSliderPosition = (position: number): number => {
  if (position <= 0) return 10000; // 0.0001 BTC
  if (position >= 100) return 100000000; // 1 BTC
  
  // Use a logarithmic scale where:
  // 0% = 10,000 sats (0.0001 BTC)
  // 50% = 1,000,000 sats (0.01 BTC)
  // 100% = 100,000,000 sats (1 BTC)
  
  if (position <= 50) {
    // Lower half of slider (0-50%) maps to 10K-1M sats - logarithmic
    const logMin = Math.log(10000);
    const logMax = Math.log(1000000);
    const normalizedPosition = position / 50;
    const amount = Math.exp(logMin + normalizedPosition * (logMax - logMin));
    return Math.round(amount);
  } else {
    // Upper half of slider (50-100%) maps to 1M-100M sats - logarithmic
    const logMin = Math.log(1000000);
    const logMax = Math.log(100000000);
    const normalizedPosition = (position - 50) / 50;
    const amount = Math.exp(logMin + normalizedPosition * (logMax - logMin));
    return Math.round(amount);
  }
};

export default function FeeCalculator() {
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [selectedFeeType, setSelectedFeeType] = useState<FeePreference>('hourFee');
  const [selectedModelId, setSelectedModelId] = useState<FeeModelConfig['id']>(RECOMMENDED_MODEL.id);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isSatsMode, setIsSatsMode] = useState<boolean>(false);
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const [simulatedFeeRate, setSimulatedFeeRate] = useState<number>(50); // Default to 50 sat/vB
  const [useAmountSlider, setUseAmountSlider] = useState<boolean>(false);
  const [showFeesInSats, setShowFeesInSats] = useState<boolean>(true); // Default to showing fees in sats
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

  // Active fee model configuration (Current vs Recommended)
  const selectedModel = FEE_MODELS[selectedModelId];

  // The network fee rate that drives the calculation (live or simulated)
  const effectiveNetworkFee = isSimulationMode
    ? simulatedFeeRate
    : (mempoolData?.fastestFee ?? 0);

  // Get fee calculation result (with BTC/USD enrichment + savings vs flat)
  const feeCalculation = (() => {
    if (!mempoolData) return null;
    const paymentAmountSats = getPaymentAmountSats();
    if (paymentAmountSats === 0) return null;

    const result = calculateBlinkFee(
      paymentAmountSats,
      selectedFeeType,
      effectiveNetworkFee,
      selectedModel,
    );
    if (!result) return null;

    const feeBTC = result.feeSats / 100000000;
    const feeUSD = feeBTC * (btcPrice || 0); // Use real-time Bitcoin price from API
    const flatFee = calculateFlatFee(paymentAmountSats);
    const savingsVsFlat = flatFee - result.feeSats; // positive => user saves

    return {
      feeSats: result.feeSats,
      feePercentage: result.feePercentage,
      transactionSize: result.transactionSize,
      feeBTC,
      feeUSD,
      flatFee,
      savingsVsFlat,
    };
  })();

  // Handle fee preference button click
  const handleFeePreferenceChange = (preference: FeePreference) => {
    setSelectedFeeType(preference);
  };

  // Get the display name for the fee type
  const getFeeTypeName = (feeType: FeePreference): string => {
    switch (feeType) {
      case 'fastestFee': return 'Priority';
      case 'hourFee': return 'Standard';
      case 'economyFee': return 'Economy';
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
          {/* Fee Model Toggle */}
          <div className="mb-6">
            <Label className="block text-sm font-medium mb-2">Fee Model</Label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.values(FEE_MODELS)).map((model) => (
                <Button
                  key={model.id}
                  variant={selectedModelId === model.id ? 'default' : 'outline'}
                  onClick={() => setSelectedModelId(model.id)}
                  className="col-span-1"
                  title={model.description}
                >
                  {model.label}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">{selectedModel.description}</p>
          </div>

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

            {/* Unit toggle and Slider toggle */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Manual</span>
                <Switch
                  checked={useAmountSlider}
                  onCheckedChange={() => setUseAmountSlider(!useAmountSlider)}
                  aria-label="Toggle between manual input and slider for amount"
                />
                <span className="text-xs text-gray-500">Slider</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">BTC</span>
                <Switch
                  checked={isSatsMode}
                  onCheckedChange={handleUnitToggleChange}
                  aria-label="Toggle between BTC and satoshi units"
                />
                <span className="text-xs text-gray-500">sats</span>
              </div>
            </div>

            {useAmountSlider ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="font-medium text-sm">
                    {isSatsMode
                      ? `${(paymentAmount ? parseInt(paymentAmount) : 0).toLocaleString()} sats`
                      : `${(paymentAmount ? parseFloat(paymentAmount) : 0).toFixed(8)} BTC`}
                  </span>
                </div>
                <Slider
                  value={[getSliderPositionFromAmount(getPaymentAmountSats() || 10000)]}
                  onValueChange={(value) => {
                    const amountSats = getAmountFromSliderPosition(value[0]);
                    if (isSatsMode) {
                      setPaymentAmount(amountSats.toString());
                    } else {
                      setPaymentAmount(satsToBtc(amountSats));
                    }
                  }}
                  min={0}
                  max={100}
                  step={1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0.0001 BTC</span>
                  <span>0.01 BTC</span>
                  <span>1 BTC</span>
                </div>
                
                {paymentAmount && (
                  <p className="mt-2 text-sm text-gray-500">
                    {getEquivalentAmount()}
                  </p>
                )}
              </div>
            ) : (
              <>
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
              </>
            )}
            
            <p className="mt-2 text-sm text-gray-500">Enter the amount you want to send through Blink.</p>
          </div>

          {/* Fee Results Card */}
          <div className={`${isSimulationMode ? 'bg-blue-50' : 'bg-gray-50'} rounded-lg p-5 mb-6 relative`}>
            {isSimulationMode && (
              <div className="absolute top-2 right-2">
                <Badge variant="outline" className="bg-blue-100 border-blue-200 text-blue-800">
                  <Sliders className="h-3 w-3 mr-1" /> Simulation Mode
                </Badge>
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Blink Fee</h3>
              <div className="flex items-center space-x-2">
                {/* Fee display toggle */}
                <div className="flex items-center space-x-2 mr-2 text-xs">
                  <span className="text-gray-500">BTC</span>
                  <Switch
                    checked={showFeesInSats}
                    onCheckedChange={() => setShowFeesInSats(!showFeesInSats)}
                    aria-label="Toggle between BTC and satoshi display for fees"
                    className="scale-75"
                  />
                  <span className="text-gray-500">sats</span>
                </div>
                
                {mempoolData && (
                  <Badge variant={getFeeBadgeVariant(selectedFeeType)}>
                    {getFeeTypeName(selectedFeeType)}
                  </Badge>
                )}
              </div>
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
                <span className="text-gray-600">
                  {isSimulationMode ? "Simulated Fee Rate:" : "Current Fee Rate:"}
                </span>
                {isLoading && !isSimulationMode ? (
                  <span className="font-medium flex items-center">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin text-orange-500" />
                    Loading...
                  </span>
                ) : isSimulationMode ? (
                  <span className="font-medium text-blue-600">{simulatedFeeRate} sat/vB</span>
                ) : mempoolData ? (
                  <span className="font-medium">{mempoolData.fastestFee} sat/vB</span>
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
                    {showFeesInSats 
                      ? `${feeCalculation.feeSats.toLocaleString()} sats`
                      : `${feeCalculation.feeBTC.toFixed(8)} BTC`
                    }
                  </span>
                ) : (
                  <span className="font-medium text-gray-400">--</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Effective Rate:</span>
                {isLoading ? (
                  <span className="font-medium flex items-center">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin text-orange-500" />
                    Loading...
                  </span>
                ) : feeCalculation ? (
                  <span className="font-medium">{(feeCalculation.feePercentage * 100).toFixed(3)}%</span>
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
              {feeCalculation && (
                <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                  <span className="text-gray-600">vs current flat fee:</span>
                  {feeCalculation.savingsVsFlat > 0 ? (
                    <span className="font-medium text-green-600">
                      You save {feeCalculation.savingsVsFlat.toLocaleString()} sats
                    </span>
                  ) : feeCalculation.savingsVsFlat < 0 ? (
                    <span className="font-medium text-gray-700">
                      +{Math.abs(feeCalculation.savingsVsFlat).toLocaleString()} sats
                    </span>
                  ) : (
                    <span className="font-medium text-gray-500">No change</span>
                  )}
                </div>
              )}
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
                className="col-span-1 flex flex-col h-auto py-2"
              >
                <span>Standard</span>
                <span className="text-[10px] font-normal opacity-80">Most popular</span>
              </Button>
              <Button
                variant={selectedFeeType === 'economyFee' ? 'default' : 'outline'}
                onClick={() => handleFeePreferenceChange('economyFee')}
                className="col-span-1"
              >
                Economy
              </Button>
            </div>
          </div>

          {/* Simulation Mode */}
          <div className="mb-6 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Sliders className="h-5 w-5 text-blue-500" />
                <Label className="text-sm font-medium">Simulation Mode</Label>
              </div>
              <Switch
                checked={isSimulationMode}
                onCheckedChange={() => setIsSimulationMode(!isSimulationMode)}
                aria-label="Toggle simulation mode"
              />
            </div>
            
            {isSimulationMode && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Simulated Fee Rate:</span>
                  <span className="font-medium text-sm">{simulatedFeeRate} sat/vB</span>
                </div>
                <Slider
                  value={[getSliderPositionFromFeeRate(simulatedFeeRate)]}
                  onValueChange={(value) => setSimulatedFeeRate(getFeeRateFromSliderPosition(value[0]))}
                  min={0}
                  max={100}
                  step={1}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Low: 1 sat/vB</span>
                  <span>Medium: 50 sat/vB</span>
                  <span>High: 2000 sat/vB</span>
                </div>
                <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <p>Simulate how fees would behave under different network congestion scenarios.</p>
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
            <div className="flex items-start mb-2">
              <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
              <p>
                {getTransactionInfoText()}
                {isSimulationMode 
                  ? ' Fees are calculated using simulated network conditions.'
                  : ' Fees are estimated based on current mempool conditions.'
                }
              </p>
            </div>
            <div className="text-xs text-gray-500 italic mt-2">
              {isSimulationMode 
                ? 'Simulation mode active - using custom fee rate'
                : (lastUpdated || 'Last updated: Fetching...')
              }
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