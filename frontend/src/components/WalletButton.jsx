import { useWallet } from "../context/WalletContext";

function truncate(address) {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function WalletButton() {
  const { publicKey, connecting, connect, balance, balanceLoading } = useWallet();

  if (publicKey) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-agro-50 dark:bg-agro-900/40 border border-agro-200 dark:border-agro-800 text-sm font-medium text-agro-700 dark:text-agro-300">
        <span className="h-2 w-2 rounded-full bg-agro-500 animate-pulse" />
        <span>{truncate(publicKey)}</span>
        {balance !== null && (
          <>
            <span className="text-agro-400 dark:text-agro-600">|</span>
            <span className={`tabular-nums transition-all duration-500 ${balanceLoading ? "opacity-50" : "opacity-100"}`}>
              {balanceLoading && balance === null ? "..." : `${balance} XLM`}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="px-4 py-1.5 rounded-full bg-agro-600 hover:bg-agro-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
    >
      {connecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
