import {
  isConnected,
  isAllowed,
  setAllowed,
  requestAccess,
  getAddress,
  getNetwork,
  signTransaction,
} from "@stellar/freighter-api";

const EXPECTED_NETWORK = "TESTNET";

/**
 * Checks whether the Freighter browser extension is installed.
 * Handles both old ({isConnected: bool}) and new (bool) return shapes
 * from @stellar/freighter-api across different versions.
 */
export async function isFreighterInstalled() {
  try {
    // Direct window check — most reliable across all versions
    if (typeof window !== "undefined" && window.freighter) {
      return true;
    }
    // Also check the freighterApi object if injected
    if (typeof window !== "undefined" && window.freighterApi) {
      return true;
    }
    // Fallback: try the API call (may return bool or {isConnected: bool})
    const result = await isConnected();
    if (typeof result === "boolean") return result;
    if (typeof result?.isConnected === "boolean") return result.isConnected;
    return false;
  } catch {
    return false;
  }
}

/**
 * Prompts the user to connect Freighter and returns their public key.
 */
export async function connectWallet() {
  const installed = await isFreighterInstalled();
  if (!installed) {
    throw new Error(
      "Freighter wallet not detected. Install it from freighter.app and refresh the page."
    );
  }

  // requestAccess works across v1 and v2
  const access = await requestAccess();
  // v2 returns the address directly, v1 returns {error, address}
  if (typeof access === "string" && access.length > 0) {
    // v2 — address returned directly
    return access;
  }
  if (access?.error) {
    throw new Error("Wallet connection was rejected.");
  }

  // Check network
  const networkResult = await getNetwork();
  const networkName =
    typeof networkResult === "string"
      ? networkResult
      : networkResult?.network || networkResult?.networkUrl || "";

  if (networkName && !networkName.toUpperCase().includes("TEST")) {
    throw new Error(
      `Please switch Freighter to TESTNET. Currently on: ${networkName}`
    );
  }

  const addressResult = await getAddress();
  // v2 may return string directly
  const address =
    typeof addressResult === "string" ? addressResult : addressResult?.address;

  if (!address) {
    throw new Error("Could not retrieve wallet address from Freighter.");
  }

  return address;
}

/**
 * Signs an XDR transaction envelope with Freighter.
 */
export async function signXdr(xdr, publicKey) {
  const result = await signTransaction(xdr, {
    networkPassphrase: "Test SDF Network ; September 2015",
    address: publicKey,
  });
  if (result?.error) {
    throw new Error(result.error.message || "Transaction signing was rejected.");
  }
  return result?.signedTxXdr ?? result;
}
