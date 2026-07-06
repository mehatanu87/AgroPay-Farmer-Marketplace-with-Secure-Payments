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
 */
export async function isFreighterInstalled() {
  try {
    const result = await isConnected();
    return !!result?.isConnected;
  } catch {
    return false;
  }
}

/**
 * Prompts the user to connect Freighter and returns their public key.
 * Throws a descriptive error if Freighter isn't installed or the user
 * rejects the connection.
 */
export async function connectWallet() {
  const installed = await isFreighterInstalled();
  if (!installed) {
    throw new Error(
      "Freighter wallet not detected. Install it from freighter.app and refresh the page."
    );
  }

  const allowed = await isAllowed();
  if (!allowed?.isAllowed) {
    const access = await requestAccess();
    if (access?.error) {
      throw new Error("Wallet connection was rejected.");
    }
    await setAllowed();
  }

  const networkResult = await getNetwork();
  if (networkResult?.network !== EXPECTED_NETWORK) {
    throw new Error(
      `Please switch Freighter to the ${EXPECTED_NETWORK} network. Currently on ${networkResult?.network || "unknown"}.`
    );
  }

  const addressResult = await getAddress();
  if (addressResult?.error || !addressResult?.address) {
    throw new Error("Could not retrieve wallet address from Freighter.");
  }

  return addressResult.address;
}

/**
 * Signs an XDR transaction envelope with Freighter and returns the
 * signed XDR, ready to submit to the network.
 */
export async function signXdr(xdr, publicKey) {
  const result = await signTransaction(xdr, {
    networkPassphrase: "Test SDF Network ; September 2015",
    address: publicKey,
  });
  if (result?.error) {
    throw new Error(result.error.message || "Transaction signing was rejected.");
  }
  return result.signedTxXdr;
}
