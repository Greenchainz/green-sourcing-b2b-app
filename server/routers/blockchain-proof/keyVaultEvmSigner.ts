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
  createPublicClient,
  encodeFunctionData,
  hexToBytes,
  http,
  keccak256,
  publicActions,
  recoverAddress,
  serializeTransaction,
  type Abi,
  type WriteContractParameters,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getPolygonRpcUrl, polygonChain, getPolygonPublicClient } from "./polygonClient";

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

    async writeContract(args) {
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
    { publicKeyToAddress },
  ] = await Promise.all([
    import(keyVaultKeysPackageName),
    import("@azure/identity"),
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

    async writeContract(args) {
      const publicClient = getPolygonPublicClient();
      const rpcClient = createPublicClient({
        chain: polygonChain,
        transport: http(getPolygonRpcUrl()),
      });

      const data = encodeFunctionData({
        abi: args.abi as Abi,
        functionName: args.functionName as string,
        args: (args.args ?? []) as readonly unknown[],
      });

      const nonce = await publicClient.getTransactionCount({
        address,
        blockTag: "pending",
      });

      const gas = await publicClient.estimateGas({
        account: address,
        to: args.address,
        data,
      });

      const chainId = polygonChain.id;

      // Prefer EIP-1559 fees; fall back to legacy gas price if needed.
      let maxFeePerGas: bigint | undefined;
      let maxPriorityFeePerGas: bigint | undefined;
      let gasPrice: bigint | undefined;

      try {
        const fees = await publicClient.estimateFeesPerGas();
        maxFeePerGas = fees.maxFeePerGas ?? undefined;
        maxPriorityFeePerGas = fees.maxPriorityFeePerGas ?? undefined;
      } catch {
        gasPrice = await publicClient.getGasPrice();
      }

      const txBase =
        maxFeePerGas && maxPriorityFeePerGas
          ? {
              chainId,
              nonce,
              to: args.address,
              data,
              gas,
              maxFeePerGas,
              maxPriorityFeePerGas,
              type: "eip1559" as const,
            }
          : {
              chainId,
              nonce,
              to: args.address,
              data,
              gas,
              gasPrice: gasPrice ?? 0n,
              type: "legacy" as const,
            };

      const serializedUnsigned = serializeTransaction(txBase);
      const digest = keccak256(serializedUnsigned);

      const signResult = await cryptoClient.sign("ES256K", hexToBytes(digest));
      if (!signResult.result || signResult.result.length === 0) {
        throw new Error("[blockchain-proof] Key Vault returned an empty signature");
      }

      const sig = signResult.result;
      if (sig.length !== 64) {
        throw new Error(
          `[blockchain-proof] Expected a 64-byte IEEE P1363 signature from Key Vault, got ${sig.length}`
        );
      }
      const r = bytesToBigInt(sig.slice(0, 32));
      const s = bytesToBigInt(sig.slice(32, 64));
      const normalizedPairs = normalizeAndExpandSignatures(r, s);

      let finalSignature:
        | { r: Hex; s: Hex; yParity: 0 | 1 }
        | undefined;

      for (const pair of normalizedPairs) {
        for (const yParity of [0, 1] as const) {
          const candidate = {
            r: bigintToHex32(pair.r),
            s: bigintToHex32(pair.s),
            yParity,
          };

          const recovered = await recoverAddress({
            hash: digest,
            signature: candidate,
          });

          if (recovered.toLowerCase() === address.toLowerCase()) {
            finalSignature = candidate;
            break;
          }
        }
        if (finalSignature) break;
      }

      if (!finalSignature) {
        throw new Error("[blockchain-proof] Could not recover signer address from Key Vault signature");
      }

      const serializedSigned = serializeTransaction(txBase, finalSignature);
      return rpcClient.sendRawTransaction({ serializedTransaction: serializedSigned });
    },
  };
}

const SECP256K1_N = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
const SECP256K1_HALF_N = SECP256K1_N / 2n;

function bigintToHex32(value: bigint): Hex {
  return `0x${value.toString(16).padStart(64, "0")}` as Hex;
}

function normalizeAndExpandSignatures(r: bigint, s: bigint): Array<{ r: bigint; s: bigint }> {
  const normalizedS = s > SECP256K1_HALF_N ? SECP256K1_N - s : s;
  const pairs: Array<{ r: bigint; s: bigint }> = [{ r, s: normalizedS }];

  // Some providers may return non-canonical S; include original for recovery fallback.
  if (normalizedS !== s) {
    pairs.push({ r, s });
  }

  return pairs;
}

function _parseDerEcdsaSignature(der: Uint8Array): { r: bigint; s: bigint } {
  if (der.length < 8 || der[0] !== 0x30) {
    throw new Error("[blockchain-proof] Invalid DER signature (missing SEQUENCE header)");
  }

  let offset = 1;
  const seqLen = der[offset];
  offset += 1;

  if (seqLen + 2 !== der.length) {
    throw new Error("[blockchain-proof] Invalid DER signature (length mismatch)");
  }

  if (der[offset] !== 0x02) {
    throw new Error("[blockchain-proof] Invalid DER signature (missing INTEGER for r)");
  }
  offset += 1;
  const rLen = der[offset];
  offset += 1;
  const rBytes = der.slice(offset, offset + rLen);
  offset += rLen;

  if (der[offset] !== 0x02) {
    throw new Error("[blockchain-proof] Invalid DER signature (missing INTEGER for s)");
  }
  offset += 1;
  const sLen = der[offset];
  offset += 1;
  const sBytes = der.slice(offset, offset + sLen);

  return {
    r: bytesToBigInt(stripLeadingZero(rBytes)),
    s: bytesToBigInt(stripLeadingZero(sBytes)),
  };
}

function stripLeadingZero(bytes: Uint8Array): Uint8Array {
  return bytes.length > 0 && bytes[0] === 0x00 ? bytes.slice(1) : bytes;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  const hex = Buffer.from(bytes).toString("hex");
  return BigInt(`0x${hex || "0"}`);
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
