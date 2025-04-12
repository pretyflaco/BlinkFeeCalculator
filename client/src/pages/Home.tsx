import FeeCalculator from "@/components/FeeCalculator";
import blinkLogo from "../assets/blink-logo.png";

export default function Home() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-10 text-center">
        <div className="flex justify-center mb-4">
          <img 
            src={blinkLogo} 
            alt="Blink Logo" 
            className="h-14 md:h-16" 
          />
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold mb-3">Calculate Your Blink Onchain Fee</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Get real-time fee estimates based on current mempool conditions for Blink onchain transactions.
        </p>
      </section>

      {/* Fee Calculator */}
      <FeeCalculator />
    </main>
  );
}
