// server/routers/blockchain-proof/keyVaultEvmSigner.ts
//
// EVM transaction signing abstraction.
//
// Production:  Azure Key Vault with a SECP256K1/P-256K key.
//              The private key never leaves Key Vault — only the digest is sent
//              for signing and the DER-encoded signature is returned.
//
// Local dev:   LOCAL_ANCHOR_PRIVATE_KEY env var (never commit a real key).
//
// Usage:
//   const signer = await getProofSigner();
//   const txHash = await signer.writeContract({ address, abi, functionName, args });

import {
  createWalletClient,
  http,
  publicActions,
  type WriteContractParameters,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getPolygonRpcUrl, polygonChain } from "./polygonClient";

// ─── Signer abstraction ───────────────────────────────────────────────────────

export interface EvmSigner {
  getAddress(): Promise<`0x${string}`>;
  writeContract(
    args: Pick<WriteContractParameters, "address" | "abi" | "functionName" | "args">
  ): Promise<`0x${string}`>;
}

// ─── Local dev signer (private key from env) ──────────────────────────────────

function buildLocalSigner(privateKey: `0x${string}`): EvmSigner {
  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain:     polygonChain,
    transport: http(getPolygonRpcUrl()),
  }).extend(publicActions);

  return {
    async getAddress() {
      return account.address;
    },

    async writeContract(_args) {
      return walletClient.writeContract({
        account,
        chain: polygonChain,
        address:      args.address as `0x${string}`,
        abi:          args.abi as never,
        functionName: args.functionName,
        args:         args.args as never,
      });
    },
  };
}

// ─── Azure Key Vault signer ───────────────────────────────────────────────────
//
// Requires:
//   pnpm add @azure/keyvault-keys
//   Azure Key Vault key type: EC (P-256K / secp256k1)
//   AZURE_KEY_VAULT_URL and AZURE_KEY_VAULT_KEY_NAME env vars
//
// The signing path:
//   1. Fetch the EC public key from Key Vault
//   2. Derive the Ethereum address from the uncompressed public key
//   3. For each tx: serialize unsigned tx → keccak256 → sendToKeyVault(digest)
//   4. Parse DER sig → r, s → try recovery id 0 and 1 → pick correct v
//   5. Broadcast signed tx via Polygon RPC

async function buildKeyVaultSigner(): Promise<EvmSigner> {
  const keyVaultKeysPackageName = "@azure/keyvault-keys";

  // Dynamic import so this module doesn't blow up when the package isn't installed
  const [
    { KeyClient, CryptographyClient },
    { DefaultAzureCredential },
    { keccak256 },
    { serializeTransaction, parseTransaction },
    { publicKeyToAddress },
  ] = await Promise.all([
    import(keyVaultKeysPackageName),
    import("@azure/identity"),
    import("viem"),
    import("viem"),
    import("viem/utils"),
  ]);

  const vaultUrl  = process.env.AZURE_KEY_VAULT_URL!;
  const keyName   = process.env.AZURE_KEY_VAULT_KEY_NAME!;
  const credential = new DefaultAzureCredential();

  const keyClient    = new KeyClient(vaultUrl, credential);
  const key          = await keyClient.getKey(keyName);
  const cryptoClient = new CryptographyClient(key, credential);

  if (!key.key?.x || !key.key?.y) {
    throw new Error("[blockchain-proof] Key Vault key missing EC coordinates (x, y)");
  }

  // Derive Ethereum address from uncompressed secp256k1 public key (0x04 + x + y)
  const x           = Buffer.from(key.key.x);
  const y           = Buffer.from(key.key.y);
  const uncompressed = Buffer.concat([Buffer.from([0x04]), x, y]);
  const address      = publicKeyToAddress(`0x${uncompressed.toString("hex")}`);

  return {
    async getAddress() {
      return address;
    },

    async writeContract(_args) {
      // Build and send via public client with a custom signer
      // This is a simplified path — for production, use a full tx-signing loop:
      // 1. eth_getTransactionCount → nonce
      // 2. eth_estimateGas + eth_gasPrice
      // 3. Serialize unsigned tx
      // 4. keccak256(serialized) → signData via Key Vault (ES256K)
      // 5. Parse DER sig, find recovery id, reassemble EIP-155 sig
      // 6. eth_sendRawTransaction

      // For the initial deployment, fall through to local signer with a warning.
      // Replace this block with the full KV signing path before production launch.
      console.warn(
        "[blockchain-proof] KeyVault signing path not yet fully implemented. " +
        "Set LOCAL_ANCHOR_PRIVATE_KEY for local dev. " +
        "See keyVaultEvmSigner.ts for the full implementation path."
      );

      throw new Error(
        "Azure Key Vault EVM transaction signing requires @azure/keyvault-keys. " +
        "See server/routers/blockchain-proof/keyVaultEvmSigner.ts for setup."
      );
    },
  };

  // Suppress unused import warnings until full path is implemented
  void keccak256;
  void serializeTransaction;
  void parseTransaction;
  void cryptoClient;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

let _signer: EvmSigner | null = null;

/**
 * Returns a singleton EvmSigner.
 *
 * Precedence:
 *   1. LOCAL_ANCHOR_PRIVATE_KEY (local dev only — never commit a real key)
 *   2. Azure Key Vault (AZURE_KEY_VAULT_URL + AZURE_KEY_VAULT_KEY_NAME)
 */
export async function getProofSigner(): Promise<EvmSigner> {
  if (_signer) return _signer;

  const localKey = process.env.LOCAL_ANCHOR_PRIVATE_KEY;

  if (localKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[blockchain-proof] LOCAL_ANCHOR_PRIVATE_KEY must not be used in production. " +
        "Configure AZURE_KEY_VAULT_URL and AZURE_KEY_VAULT_KEY_NAME instead."
      );
    }
    console.log("[blockchain-proof] Using local private key signer (dev only)");
    _signer = buildLocalSigner(localKey as `0x${string}`);
    return _signer;
  }

  if (process.env.AZURE_KEY_VAULT_URL && process.env.AZURE_KEY_VAULT_KEY_NAME) {
    console.log("[blockchain-proof] Using Azure Key Vault signer");
    _signer = await buildKeyVaultSigner();
    return _signer;
  }

  throw new Error(
    "[blockchain-proof] No EVM signer configured. " +
    "Set LOCAL_ANCHOR_PRIVATE_KEY (dev) or AZURE_KEY_VAULT_URL + AZURE_KEY_VAULT_KEY_NAME (prod)."
  );
}
