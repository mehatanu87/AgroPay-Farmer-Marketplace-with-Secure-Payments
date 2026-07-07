import {
  Contract,
  rpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
} from "@stellar/stellar-sdk";
import { signXdr } from "./wallet";

const RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = "CDLMALEHLMMQRYDDS6T32SR7HCV6DGEU3NNO34TYUIXNHHSCGRFKGRGF"; // Overriding Vercel env var temporarily
const NETWORK_PASSPHRASE = Networks.TESTNET;

const server = new rpc.Server(RPC_URL, { allowHttp: false });

/**
 * Builds, simulates, signs (via Freighter), and submits a call to the
 * AgroPay escrow contract. Returns the transaction hash and, when the
 * contract method returns a value, its decoded native JS value.
 *
 * NOTE: This is the integration point between the UI and the on-chain
 * contract. It must be tested against a contract actually deployed to
 * testnet before relying on it — argument encoding in particular is
 * easy to get subtly wrong and should be verified call-by-call.
 */
export async function callContract(method, args, sourcePublicKey) {
  if (!CONTRACT_ID) {
    throw new Error("VITE_ESCROW_CONTRACT_ID is not set. Deploy the contract and set this env var.");
  }

  const contract = new Contract(CONTRACT_ID);
  const account = await server.getAccount(sourcePublicKey);

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  let signedXdr;
  try {
    // We send the raw Transaction directly to Freighter without simulating.
    // Freighter's extension will automatically simulate the transaction and
    // attach the necessary resource footprint for Protocol 22.
    signedXdr = await signXdr(tx.toXDR(), sourcePublicKey);
  } catch (e) {
    throw new Error(`Freighter Error: ${e.message}`);
  }

  let signedTx;
  try {
    signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  } catch (e) {
    throw new Error(`Builder Error: ${e.message}`);
  }

  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  const hash = sendResult.hash;
  const finalStatus = await pollTransaction(hash);

  let returnValue = null;
  if (finalStatus.status === "SUCCESS" && finalStatus.returnValue) {
    returnValue = scValToNative(finalStatus.returnValue);
  }

  return { hash, returnValue };
}

async function pollTransaction(hash, attempts = 15, delayMs = 2000) {
  for (let i = 0; i < attempts; i++) {
    const result = await server.getTransaction(hash);
    if (result.status !== "NOT_FOUND") {
      return result;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("Timed out waiting for transaction confirmation.");
}

// --- Convenience wrappers for each contract method ---

export const escrowContract = {
  createListing: (publicKey, { title, pricePerUnit, unit, quantityAvailable }) =>
    callContract(
      "create_listing",
      [
        new Address(publicKey).toScVal(),
        nativeToScVal(title, { type: "string" }),
        nativeToScVal(BigInt(Math.round(pricePerUnit * 1e7)), { type: "i128" }),
        nativeToScVal(unit, { type: "string" }),
        nativeToScVal(quantityAvailable, { type: "u32" }),
      ],
      publicKey
    ),

  placeOrder: (publicKey, { listingId, quantity, deliveryWindowDays }) =>
    callContract(
      "place_order",
      [
        new Address(publicKey).toScVal(),
        nativeToScVal(listingId, { type: "u64" }),
        nativeToScVal(quantity, { type: "u32" }),
        nativeToScVal(deliveryWindowDays, { type: "u32" }),
      ],
      publicKey
    ),

  markDelivered: (publicKey, { orderId, proofHash }) =>
    callContract(
      "mark_delivered",
      [
        new Address(publicKey).toScVal(),
        nativeToScVal(orderId, { type: "u64" }),
        nativeToScVal(proofHash, { type: "string" }),
      ],
      publicKey
    ),

  confirmDelivery: (publicKey, { orderId }) =>
    callContract(
      "confirm_delivery",
      [new Address(publicKey).toScVal(), nativeToScVal(orderId, { type: "u64" })],
      publicKey
    ),

  raiseDispute: (publicKey, { orderId }) =>
    callContract(
      "raise_dispute",
      [new Address(publicKey).toScVal(), nativeToScVal(orderId, { type: "u64" })],
      publicKey
    ),

  claimRefund: (publicKey, { orderId }) =>
    callContract(
      "claim_refund",
      [new Address(publicKey).toScVal(), nativeToScVal(orderId, { type: "u64" })],
      publicKey
    ),

  // Admin-only. `adminPublicKey` must match the address passed to
  // initialize() when the contract was deployed.
  resolveDispute: (adminPublicKey, { orderId, releaseToFarmer }) =>
    callContract(
      "resolve_dispute",
      [
        new Address(adminPublicKey).toScVal(),
        nativeToScVal(orderId, { type: "u64" }),
        nativeToScVal(releaseToFarmer, { type: "bool" }),
      ],
      adminPublicKey
    ),
};
