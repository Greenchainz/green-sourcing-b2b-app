// server/routers/blockchain-proof/polygonClient.ts
//
// Viem public client for Polygon PoS (chainId 137) or Amoy testnet (80002).
// Used for reading chain state and waiting for transaction receipts.

import { createPublicClient, http, defineChain } from "viem";

const chainId = Number(process.env.POLYGON_CHAIN_ID ?? 137);
const rpcUrl  = process.env.POLYGON_RPC_URL ?? "";

if (!rpcUrl && process.env.BLOCKCHAIN_PROOF_ENABLED === "true") {
  console.warn("[blockchain-proof] POLYGON_RPC_URL is not set — anchoring will fail");
}

export const polygonChain = defineChain({
  id: chainId,
  name: chainId === 137 ? "Polygon PoS" : "Polygon Amoy Testnet",
  nativeCurrency: {
    name:     "POL",
    symbol:   "POL",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [rpcUrl] },
    public:  { http: [rpcUrl] },
  },
  blockExplorers: {
    default: {
      name: "PolygonScan",
      url:  chainId === 137
        ? "https://polygonscan.com"
        : "https://amoy.polygonscan.com",
    },
  },
});

export const polygonPublicClient = createPublicClient({
  chain:     polygonChain,
  transport: http(rpcUrl),
});

/**
 * Build the full PolygonScan explorer URL for a transaction hash.
 */
export function explorerUrl(txHash: string): string {
  const base = process.env.PROOF_EXPLORER_BASE_URL
    ?? (chainId === 137
      ? "https://polygonscan.com/tx/"
      : "https://amoy.polygonscan.com/tx/");
  return `${base}${txHash}`;
}
