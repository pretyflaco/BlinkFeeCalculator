import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Documentation() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Blink Fee Calculation Documentation</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>
            How Blink calculates onchain send fees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Blink calculates onchain Bitcoin transaction fees based on real-time mempool data and the characteristics
            of your transaction. This ensures you pay appropriate fees for the current network conditions while
            optimizing for cost and confirmation speed.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fee Calculation Model</CardTitle>
          <CardDescription>
            The components that determine your transaction fee
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <h3 className="text-lg font-medium">Core Formula</h3>
          <p className="text-sm leading-relaxed">
            Blink fees are calculated using this formula:
          </p>
          <div className="bg-gray-50 p-3 rounded-md font-mono text-sm">
            Fee = (Payment Amount × Percentage Fee) + (Transaction Size × Base Multiplier)
          </div>
          
          <Separator className="my-4" />
          
          <h3 className="text-lg font-medium">Transaction Size Calculation</h3>
          <p className="text-sm leading-relaxed">
            The transaction size in vbytes is dynamically calculated based on your payment amount:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Base size: 11 vbytes</li>
            <li>Each input: 68 vbytes</li>
            <li>Each output: 31 vbytes</li>
            <li>Number of inputs scales with payment amount (1-6 inputs)</li>
            <li>Default configuration uses 2 outputs</li>
          </ul>
          
          <Separator className="my-4" />
          
          <h3 className="text-lg font-medium">Percentage Fee Component</h3>
          <p className="text-sm leading-relaxed">
            The percentage fee uses exponential decay to ensure fairness across payment amounts:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>For smaller amounts (&lt;4M sats): Higher percentage fee that decays exponentially</li>
            <li>For larger amounts (≥4M sats): Constant value divided by amount</li>
            <li>Adjusted based on current network congestion</li>
          </ul>
          
          <Separator className="my-4" />
          
          <h3 className="text-lg font-medium">Base Multiplier Component</h3>
          <p className="text-sm leading-relaxed">
            The base multiplier is calculated using the current network fastestFee rate for all tiers:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Priority: (2 ÷ fastestFee) + 1.3</li>
            <li>Standard: (1 ÷ fastestFee) + 1.1</li>
            <li>Slow: (2 ÷ fastestFee) + 1.1</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fee Preference Tiers</CardTitle>
          <CardDescription>
            Choose the right balance between speed and cost
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <h3 className="text-lg font-medium">Priority (Fast)</h3>
          <p className="text-sm leading-relaxed">
            Uses the <code>fastestFee</code> rate from the mempool, targeting inclusion in the next block.
            This option provides the quickest confirmations but at a higher cost.
          </p>
          
          <Separator className="my-4" />
          
          <h3 className="text-lg font-medium">Standard</h3>
          <p className="text-sm leading-relaxed">
            Uses the <code>fastestFee</code> rate from the mempool, but with modified base multiplier
            for a medium priority calculation. This offers a balance between fee and speed.
          </p>
          
          <Separator className="my-4" />
          
          <h3 className="text-lg font-medium">Slow (Economy)</h3>
          <p className="text-sm leading-relaxed">
            Uses the <code>fastestFee</code> rate from the mempool, but with a modified base multiplier
            for a lower cost calculation. This is the most cost-effective option.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
          <CardDescription>
            Where we get our fee rate information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">
            Fee rates are sourced from the mempool.space API, which provides real-time data on Bitcoin network congestion 
            and recommended fee rates. The Bitcoin price is obtained from the Blink API to calculate USD equivalents.
          </p>
          <p className="text-sm leading-relaxed mt-3">
            All data is refreshed regularly to ensure fee calculations reflect current network conditions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}