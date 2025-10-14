import { Link } from 'react-router-dom';
import { WalletButton } from '@/components/Wallet/WalletButton';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-bold text-white">Fundraisely</h1>
        <WalletButton />
      </header>

      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-6xl font-bold text-white mb-6">
          Blockchain-Powered Fundraising Games
        </h2>
        <p className="text-xl text-gray-300 mb-8">
          Create quiz rooms, collect entry fees, and distribute prizes transparently on Solana
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            to="/create"
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
          >
            Create Room
          </Link>
          <button className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition">
            Join Room
          </button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            title="Transparent"
            description="All transactions on-chain, fully auditable"
          />
          <FeatureCard
            title="Fast"
            description="Powered by Solana's high-speed blockchain"
          />
          <FeatureCard
            title="Fair"
            description="Automated prize distribution via smart contracts"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </div>
  );
}
