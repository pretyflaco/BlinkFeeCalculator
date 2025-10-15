import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

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

// Calculate base multipliers for each tier
const calculateBaseMultiplier = (
  networkFee: number,
  tier: 'priority' | 'standard' | 'economy'
): number => {
  switch (tier) {
    case 'priority':
      return (2 / networkFee) + 1.3;
    case 'standard':
      return (1 / networkFee) + 1.1;
    case 'economy':
      return (2 / networkFee) + 1.1;
    default:
      return 0;
  }
};

const generateChartData = () => {
  const data = [];
  
  // Generate data points across the fee rate range
  const feeRates = [
    1, 2, 3, 5, 10, 20, 30, 50, 75, 100,
    150, 200, 300, 500, 750, 1000, 1500, 2000
  ];
  
  for (const feeRate of feeRates) {
    data.push({
      feeRate,
      feeRateLabel: feeRate >= 1000 ? `${(feeRate / 1000).toFixed(1)}K` : feeRate.toString(),
      priority: calculateBaseMultiplier(feeRate, 'priority'),
      standard: calculateBaseMultiplier(feeRate, 'standard'),
      economy: calculateBaseMultiplier(feeRate, 'economy'),
    });
  }
  
  return data;
};

export default function BaseMultiplierChart() {
  const [sliderPosition, setSliderPosition] = useState(0); // Default to 1 sat/vB (calm)
  const networkFee = getFeeRateFromSliderPosition(sliderPosition);
  const chartData = generateChartData();
  const networkCondition = getNetworkCondition(networkFee);
  
  // Calculate current multipliers for the selected network fee
  const currentMultipliers = {
    priority: calculateBaseMultiplier(networkFee, 'priority'),
    standard: calculateBaseMultiplier(networkFee, 'standard'),
    economy: calculateBaseMultiplier(networkFee, 'economy'),
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2">
            {data.feeRate} sat/vB
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(3)}×
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Base Multiplier Comparison</CardTitle>
        <CardDescription>
          How base multipliers change with network conditions across all tiers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="multiplier-network-slider" className="text-sm font-medium">
              Network Condition:
            </Label>
            <span className={`text-sm font-medium ${networkCondition.color}`}>
              {networkCondition.emoji} {networkCondition.label} ({networkFee} sat/vB)
            </span>
          </div>
          <Slider
            id="multiplier-network-slider"
            value={[sliderPosition]}
            onValueChange={(value) => setSliderPosition(value[0])}
            min={0}
            max={100}
            step={1}
            className="w-full"
            data-testid="slider-multiplier-network-condition"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>1 sat/vB (Calm)</span>
            <span>2000 sat/vB (Extreme)</span>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="text-xs font-medium text-blue-700 mb-1">Priority</div>
            <div className="text-2xl font-bold text-blue-900">{currentMultipliers.priority.toFixed(3)}×</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="text-xs font-medium text-green-700 mb-1">Standard</div>
            <div className="text-2xl font-bold text-green-900">{currentMultipliers.standard.toFixed(3)}×</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <div className="text-xs font-medium text-orange-700 mb-1">Economy</div>
            <div className="text-2xl font-bold text-orange-900">{currentMultipliers.economy.toFixed(3)}×</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="feeRateLabel"
              label={{ value: 'Network Fee Rate (sat/vB)', position: 'insideBottom', offset: -5 }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              label={{ value: 'Base Multiplier (×)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
              domain={[1, 'auto']}
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
              <span>Base multipliers decrease as network fees increase, following a hyperbolic curve (inversely proportional)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Priority tier has the highest base multiplier at all network conditions due to its formula: (2 / networkFee) + 1.3</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Economy and Standard tiers have the same base component (2 / networkFee for Priority vs 1 / networkFee for Standard), but different constants</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>At very high network congestion (2000 sat/vB), all multipliers converge toward their constant values (1.3, 1.1, and 1.1)</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
