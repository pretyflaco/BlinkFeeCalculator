import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  type FeeModelConfig,
  type FeePreference,
  FEE_MODELS,
  RECOMMENDED_MODEL,
  calculateFeePercentage,
} from "@/lib/feeModels";

const TIER_TO_PREF: Record<'priority' | 'standard' | 'economy', FeePreference> = {
  priority: 'fastestFee',
  standard: 'hourFee',
  economy: 'economyFee',
};

// Convert fee rate to slider position (0-100) - logarithmic scale
const getSliderPositionFromFeeRate = (feeRate: number): number => {
  if (feeRate <= 1) return 0;
  if (feeRate >= 2000) return 100;
  
  if (feeRate <= 50) {
    return Math.round((feeRate - 1) / (50 - 1) * 50);
  } else {
    const logMin = Math.log(50);
    const logMax = Math.log(2000);
    const scale = (Math.log(feeRate) - logMin) / (logMax - logMin);
    return Math.round(50 + (scale * 50));
  }
};

// Convert slider position (0-100) to fee rate - logarithmic scale
const getFeeRateFromSliderPosition = (position: number): number => {
  if (position <= 0) return 1;
  if (position >= 100) return 2000;
  
  if (position <= 50) {
    const feeRate = 1 + (position / 50) * (50 - 1);
    return Math.round(feeRate);
  } else {
    const logMin = Math.log(50);
    const logMax = Math.log(2000);
    const normalizedPosition = (position - 50) / 50;
    const feeRate = Math.exp(logMin + normalizedPosition * (logMax - logMin));
    return Math.round(feeRate);
  }
};

// Get network condition description based on fee rate
const getNetworkCondition = (feeRate: number): { emoji: string; label: string; color: string } => {
  if (feeRate <= 2) return { emoji: '🟢', label: 'Calm', color: 'text-green-600' };
  if (feeRate <= 10) return { emoji: '🟡', label: 'Low', color: 'text-yellow-600' };
  if (feeRate <= 50) return { emoji: '🟠', label: 'Moderate', color: 'text-orange-500' };
  if (feeRate <= 200) return { emoji: '🔴', label: 'High', color: 'text-red-500' };
  return { emoji: '🔴', label: 'Extreme', color: 'text-red-700' };
};

const generateChartData = (networkFee: number, model: FeeModelConfig) => {
  const data = [];

  const amounts = [
    10000, 20000, 50000, 100000, 200000, 500000,
    1000000, 2000000, 3000000, 4000000, 5000000,
    10000000, 20000000, 50000000, 100000000
  ];

  for (const amount of amounts) {
    data.push({
      amount,
      amountBTC: amount / 100000000,
      amountLabel: amount >= 1000000 ? `${(amount / 1000000).toFixed(1)}M` : `${(amount / 1000).toFixed(0)}K`,
      priority: calculateFeePercentage(amount, TIER_TO_PREF.priority, networkFee, model) * 100,
      standard: calculateFeePercentage(amount, TIER_TO_PREF.standard, networkFee, model) * 100,
      economy: calculateFeePercentage(amount, TIER_TO_PREF.economy, networkFee, model) * 100,
    });
  }

  return data;
};

export default function FeeComparisonChart() {
  const [sliderPosition, setSliderPosition] = useState(0); // Default to 1 sat/vB (calm)
  const [selectedModelId, setSelectedModelId] = useState<FeeModelConfig['id']>(RECOMMENDED_MODEL.id);
  const model = FEE_MODELS[selectedModelId];
  const networkFee = getFeeRateFromSliderPosition(sliderPosition);
  const chartData = generateChartData(networkFee, model);
  const networkCondition = getNetworkCondition(networkFee);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2">
            {data.amountBTC.toFixed(8)} BTC ({data.amount.toLocaleString()} sats)
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(3)}%
              {data.amount >= model.decayStartAmount && ' (cap)'}
            </p>
          ))}
          <p className="text-xs text-gray-500 mt-1">
            Network: {networkCondition.label} ({networkFee} sat/vB)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Fee Percentage Comparison</CardTitle>
        <CardDescription>
          How fee percentages change across payment amounts and network conditions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Label className="block text-sm font-medium mb-2">Fee Model</Label>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(FEE_MODELS).map((m) => (
              <Button
                key={m.id}
                variant={selectedModelId === m.id ? 'default' : 'outline'}
                onClick={() => setSelectedModelId(m.id)}
                size="sm"
                title={m.description}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="network-slider" className="text-sm font-medium">
              Network Condition:
            </Label>
            <span className={`text-sm font-medium ${networkCondition.color}`}>
              {networkCondition.emoji} {networkCondition.label} ({networkFee} sat/vB)
            </span>
          </div>
          <Slider
            id="network-slider"
            value={[sliderPosition]}
            onValueChange={(value) => setSliderPosition(value[0])}
            min={0}
            max={100}
            step={1}
            className="w-full"
            data-testid="slider-network-condition"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>1 sat/vB (Calm)</span>
            <span>2000 sat/vB (Extreme)</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="amountLabel"
              label={{ value: 'Payment Amount', position: 'insideBottom', offset: -5 }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              label={{ value: 'Fee Percentage (%)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
              domain={[0, Math.max(...Object.values(model.tiers).map((t) => t.maxRate)) * 100 * 1.1]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="priority"
              stroke="#3b82f6"
              strokeWidth={2.5}
              name="Priority"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="standard"
              stroke="#22c55e"
              strokeWidth={2.5}
              name="Standard"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="economy"
              stroke="#f97316"
              strokeWidth={2.5}
              name="Economy"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Key Insights:</h4>
          <ul className="text-sm space-y-2 text-gray-600">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Fee percentages decrease exponentially as payment amounts increase, making larger transactions more cost-effective</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>
                Above {(model.decayStartAmount / 1000000).toLocaleString()}M sats the model switches to a linear-tail formula. In the
                Recommended model this threshold is set to 100M sats, so real transactions stay on the smooth curve (no visible cap).
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>As network congestion rises, each tier's effective rate blends toward its configured congestion target</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Economy tier is most cost-effective for all payment sizes, while Priority offers fastest confirmation times</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
