export default function About() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">About Blink Fee Calculator</h1>
      
      <div className="prose max-w-none">
        <p className="text-lg">
          The Blink Fee Calculator provides real-time estimates for Bitcoin transaction fees based on current network conditions.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
        <p>
          We believe in making Bitcoin transactions accessible and transparent for everyone. 
          Our calculator helps you understand the cost of sending Bitcoin on-chain 
          and allows you to choose the right fee level for your needs.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">How It Works</h2>
        <p>
          The calculator uses real-time data from the mempool.space API to provide accurate fee estimates.
          It takes into account the current state of the Bitcoin mempool, transaction size, and other factors
          to give you the most accurate fee estimate possible.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Why Choose Different Fee Levels?</h2>
        <p>
          Bitcoin transactions are prioritized by miners based on their fee rates. Higher fees mean faster confirmation
          times, while lower fees may take longer to confirm but cost less. Our calculator gives you options
          to choose the right balance for your specific needs:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong>Priority:</strong> For when time is critical and you need fast confirmation</li>
          <li><strong>Standard:</strong> A balanced approach for most everyday transactions</li>
          <li><strong>Slow:</strong> The most economical option when you're not in a hurry</li>
        </ul>
      </div>
    </div>
  );
}