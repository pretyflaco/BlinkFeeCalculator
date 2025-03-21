
import { Card, CardContent } from "@/components/ui/card";

export default function Documentation() {
  return (
    <Card className="shadow-md">
      <CardContent className="p-6 space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">How Blink Fees Are Calculated</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Basic Formula</h3>
              <p className="text-gray-600">
                Blink fee = (Payment Amount × Fee Percentage) + (Network Cost × Base Multiplier)
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Fee Tiers</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Priority:</strong> Fastest confirmation, higher fees, individual transaction</li>
                <li><strong>Standard:</strong> Regular confirmation time, balanced fees, individual transaction</li>
                <li><strong>Slow:</strong> Longer confirmation time, lowest fees, batched with other payments</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">Network Cost Calculation</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Priority/Standard:</strong> Transaction size × Current mempool fee rate</li>
                <li><strong>Slow:</strong> (Batch transaction size × Current mempool fee rate) ÷ 10 payments</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">Transaction Size</h3>
              <p className="text-gray-600">
                Transaction size varies based on the number of inputs needed, which increases with payment amount. The calculator automatically determines the optimal number of inputs for your transaction.
              </p>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
