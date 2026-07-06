import { Link } from "react-router-dom";
import { ShieldCheck, Handshake, Sprout, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Sprout,
    title: "Farmers list produce",
    desc: "Farmers post crops directly with price, quantity, and quality details — no middlemen.",
  },
  {
    icon: ShieldCheck,
    title: "Buyers pay into escrow",
    desc: "Payment is locked in a Soroban smart contract the moment an order is placed.",
  },
  {
    icon: Handshake,
    title: "Funds release on delivery",
    desc: "The farmer gets paid automatically once the buyer confirms the produce arrived.",
  },
];

export default function Landing() {
  return (
    <div>
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-agro-50 text-agro-700 text-xs font-semibold mb-4">
          Built on Stellar · Soroban Smart Contracts
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
          Fair prices for farmers.
          <br />
          <span className="text-agro-600">Secure payments for everyone.</span>
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto mb-8">
          AgroPay cuts out intermediaries with a direct farmer-to-buyer marketplace, secured by
          on-chain escrow that only releases funds after confirmed delivery.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/marketplace"
            className="px-6 py-3 rounded-full bg-agro-600 hover:bg-agro-700 text-white font-medium text-sm flex items-center gap-2"
          >
            Browse Marketplace <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/signup"
            className="px-6 py-3 rounded-full border border-gray-300 dark:border-gray-700 font-medium text-sm"
          >
            Sell Your Produce
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16 grid sm:grid-cols-3 gap-6">
        {steps.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow"
          >
            <div className="h-10 w-10 rounded-full bg-agro-50 flex items-center justify-center mb-4">
              <Icon className="h-5 w-5 text-agro-600" />
            </div>
            <h3 className="font-semibold mb-1">{title}</h3>
            <p className="text-sm text-gray-500">{desc}</p>
          </div>
        ))}
      </section>

      <section className="bg-earth-50 dark:bg-gray-900 py-14">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-2">Why escrow on Stellar?</h2>
          <p className="text-gray-500 text-sm">
            Traditional platforms hold buyer trust hostage to manual dispute resolution. AgroPay's
            escrow contract enforces the rules automatically — fast settlement for farmers,
            protection for buyers, and a public, verifiable transaction trail for every order.
          </p>
        </div>
      </section>
    </div>
  );
}
