import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

const calculateFeePercentage = (
  paymentAmountSats: number,
  tier: 'priority' | 'standard' | 'economy',
  networkFee: number
): number => {
  let expDecay: number;
  
  switch (tier) {
    case 'priority':
      expDecay = calculateExpDecay(paymentAmountSats, 0.0075, 0.04, 30000);
      return expDecay + ((networkFee - 1) / (2000 - 1)) * (0.005 - expDecay);
    case 'standard':
      expDecay = calculateExpDecay(paymentAmountSats, 0.005, 0.03, 20000);
      return expDecay + ((networkFee - 1) / (2000 - 1)) * (0.0025 - expDecay);
    case 'economy':
      expDecay = calculateExpDecay(paymentAmountSats, 0.003125, 0.02, 12500);
      return expDecay + ((networkFee - 1) / (2000 - 1)) * (0.001 - expDecay);
    default:
      return 0;
  }
};

const generateChartData = (networkFee: number) => {
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
      priority: calculateFeePercentage(amount, 'priority', networkFee) * 100,
      standard: calculateFeePercentage(amount, 'standard', networkFee) * 100,
      economy: calculateFeePercentage(amount, 'economy', networkFee) * 100,
    });
  }
  
  return data;
};

export default function FeeComparisonChart() {
  const [isCongestedNetwork, setIsCongestedNetwork] = useState(false);
  const networkFee = isCongestedNetwork ? 2000 : 1;
  const chartData = generateChartData(networkFee);

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
              {data.amount >= 4000000 && ` (${entry.name === 'Priority' ? '30K' : entry.name === 'Standard' ? '20K' : '12.5K'} cap)`}
            </p>
          ))}
          <p className="text-xs text-gray-500 mt-1">
            Network: {isCongestedNetwork ? 'Congested (2000 sat/vB)' : 'Calm (1 sat/vB)'}
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
        <div className="flex items-center space-x-3 mb-6">
          <Label htmlFor="network-toggle" className="text-sm font-medium">
            Network Condition:
          </Label>
          <span className="text-sm text-gray-600">
            {isCongestedNetwork ? '🔴 Congested (2000 sat/vB)' : '🟢 Calm (1 sat/vB)'}
          </span>
          <Switch
            id="network-toggle"
            checked={isCongestedNetwork}
            onCheckedChange={setIsCongestedNetwork}
            data-testid="toggle-network-condition"
          />
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
              domain={[0, 4.5]}
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
              <span>At 4M sats, the fee model switches to a capped formula to ensure fees never exceed the tier's maximum (30K, 20K, or 12.5K sats)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Network congestion can reduce fee percentages by up to 0.5%, 0.25%, and 0.1% for Priority, Standard, and Economy tiers respectively</span>
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
