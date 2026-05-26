// server/routers/blockchain-proof/polygonClient.ts
//
// Viem public client for Polygon PoS (chainId 137) or Amoy testnet (80002).
// Used for reading chain state and waiting for transaction receipts.

import { createPublicClient, http, defineChain } from "viem";

const chainId = Number(process.env.POLYGON_CHAIN_ID ?? 137);
const POLYGON_MAINNET_FALLBACK_RPC = "https://polygon-rpc.com";
const POLYGON_AMOY_FALLBACK_RPC = "https://rpc-amoy.polygon.technology";
const configuredRpcUrl = process.env.POLYGON_RPC_URL?.trim();
const fallbackRpcUrl = chainId === 137
  ? POLYGON_MAINNET_FALLBACK_RPC
  : POLYGON_AMOY_FALLBACK_RPC;
const resolvedRpcUrl = configuredRpcUrl || fallbackRpcUrl;

if (!configuredRpcUrl && process.env.BLOCKCHAIN_PROOF_ENABLED === "true") {
  console.warn("[blockchain-proof] POLYGON_RPC_URL is not set — using fallback public RPC endpoint");
}

export function getPolygonRpcUrl(): string {
  return resolvedRpcUrl;
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
    default: { http: [resolvedRpcUrl] },
    public:  { http: [resolvedRpcUrl] },
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

let cachedPolygonPublicClient: ReturnType<typeof createPublicClient> | null = null;
export function getPolygonPublicClient() {
  if (cachedPolygonPublicClient) return cachedPolygonPublicClient;
  cachedPolygonPublicClient = createPublicClient({
    chain:     polygonChain,
    transport: http(getPolygonRpcUrl()),
  });
  return cachedPolygonPublicClient;
}

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
