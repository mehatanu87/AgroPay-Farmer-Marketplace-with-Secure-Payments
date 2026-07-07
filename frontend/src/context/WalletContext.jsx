import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { connectWallet as connectFreighter } from "../services/wallet";
import { authApi } from "../services/api";
import { useAuth } from "./AuthContext";
import { Networks, Horizon } from "@stellar/stellar-sdk";

const WalletContext = createContext(null);

const HORIZON_URL = import.meta.env.VITE_STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org";
const server = new Horizon.Server(HORIZON_URL);

export function WalletProvider({ children }) {
  const { user, updateUser } = useAuth();
  const [publicKey, setPublicKey] = useState(user?.walletAddress || null);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState(null); // XLM balance
  const [balanceLoading, setBalanceLoading] = useState(false);
  const pollRef = useRef(null);

  // Fetch balance from Horizon
  const fetchBalance = useCallback(async (address) => {
    if (!address) return;
    try {
      setBalanceLoading(true);
      const account = await server.loadAccount(address);
      const xlm = account.balances.find((b) => b.asset_type === "native");
      setBalance(xlm ? parseFloat(xlm.balance).toFixed(2) : "0.00");
    } catch {
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  // Poll balance every 8 seconds when wallet connected
  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    fetchBalance(publicKey);
    pollRef.current = setInterval(() => fetchBalance(publicKey), 8000);
    return () => clearInterval(pollRef.current);
  }, [publicKey, fetchBalance]);

  // Refresh balance manually (call after a transaction)
  const refreshBalance = useCallback(() => {
    if (publicKey) fetchBalance(publicKey);
  }, [publicKey, fetchBalance]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const address = await connectFreighter();
      setPublicKey(address);
      fetchBalance(address);

      if (user) {
        const { data } = await authApi.linkWallet(address);
        updateUser(data.user);
      }

      toast.success("Wallet connected");
      return address;
    } catch (err) {
      toast.error(err.message || "Failed to connect wallet");
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [user, updateUser, fetchBalance]);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setBalance(null);
  }, []);

  return (
    <WalletContext.Provider value={{ publicKey, connecting, connect, disconnect, balance, balanceLoading, refreshBalance }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
