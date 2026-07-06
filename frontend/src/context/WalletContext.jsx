import { createContext, useContext, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { connectWallet as connectFreighter } from "../services/wallet";
import { authApi } from "../services/api";
import { useAuth } from "./AuthContext";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const { user, updateUser } = useAuth();
  const [publicKey, setPublicKey] = useState(user?.walletAddress || null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const address = await connectFreighter();
      setPublicKey(address);

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
  }, [user, updateUser]);

  const disconnect = useCallback(() => {
    setPublicKey(null);
  }, []);

  return (
    <WalletContext.Provider value={{ publicKey, connecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
