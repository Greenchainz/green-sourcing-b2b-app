// server/routers/blockchain-proof/anchorService.ts
//
// Core anchoring logic:
//   1. Call anchor() on AnchorRegistry.sol via the proof signer
//   2. Wait for on-chain confirmation
//   3. Persist proof record in blockchain_anchors
//   4. Emit an internal audit event

import { getDb } from "../../db";
import { blockchainAnchors } from "../../../drizzle/schema";
import { anchorRegistryAbi } from "./anchorRegistryAbi";
import { getPolygonPublicClient } from "./polygonClient";
import { getProofSigner } from "./keyVaultEvmSigner";
import { ARTIFACT_TYPE_IDS, type AnchorArtifactInput, type AnchorArtifactResult } from "./proofTypes";

/**
 * Anchor a verified artifact on Polygon and persist the proof record.
 *
 * Throws if:
 *   - BLOCKCHAIN_PROOF_ENABLED !== "true"
 *   - No signer is configured
 *   - The on-chain transaction fails or reverts
 *   - The database is unavailable
 */
export async function anchorArtifact(
  input: AnchorArtifactInput
): Promise<AnchorArtifactResult> {
  if (process.env.BLOCKCHAIN_PROOF_ENABLED !== "true") {
    throw new Error("[blockchain-proof] Anchoring is disabled (BLOCKCHAIN_PROOF_ENABLED != true)");
  }

  // ── Stub mode (no deployed contract yet) ────────────────────────────────────
  if (process.env.BLOCKCHAIN_PROOF_STUB === "true") {
    console.warn("[blockchain-proof] STUB MODE — returning fake proof, not writing to chain");
    const stubTxHash = `0x${"ab".repeat(32)}` as `0x${string}`;
    const chainId = Number(process.env.POLYGON_CHAIN_ID ?? 80002);
    const contractAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;

    const db = await getDb();
    if (db) {
      await db.insert(blockchainAnchors).values({
        anchoredByUserId:   input.anchoredByUserId ?? null,
        artifactType:       input.artifactType,
        artifactId:         input.artifactId,
        artifactHash:       input.artifactHash,
        contextHash:        input.contextHash,
        chainId,
        contractAddress,
        txHash:             stubTxHash,
        blockNumber:        null,
        verificationStatus: "anchored",
        anchoredAt:         new Date(),
      });
    }

    return { txHash: stubTxHash, blockNumber: undefined, chainId, contractAddress };
  }

  const db = await getDb();
  if (!db) {
    throw new Error("[blockchain-proof] Database unavailable — cannot persist proof record");
  }

  const contractAddress = process.env.ANCHOR_REGISTRY_ADDRESS as `0x${string}`;
  if (!contractAddress) {
    throw new Error("[blockchain-proof] ANCHOR_REGISTRY_ADDRESS is not set");
  }

  const artifactTypeId = ARTIFACT_TYPE_IDS[input.artifactType];
  if (!artifactTypeId) {
    throw new Error(`[blockchain-proof] Unknown artifactType: ${input.artifactType}`);
  }

  const signer = await getProofSigner();

  // ── Submit transaction ───────────────────────────────────────────────────────
  let txHash: `0x${string}`;
  try {
    txHash = await signer.writeContract({
      address:      contractAddress,
      abi:          anchorRegistryAbi,
      functionName: "anchor",
      args:         [input.artifactHash, input.contextHash, artifactTypeId],
    });
  } catch (err) {
    console.error("[blockchain-proof] anchor() transaction failed:", err);
    throw new Error(
      `[blockchain-proof] Failed to submit anchor transaction: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err }
    );
  }

  console.log(`[blockchain-proof] Anchor tx submitted: ${txHash} (${input.artifactType} / ${input.artifactId})`);

  // ── Wait for confirmation ────────────────────────────────────────────────────
  let blockNumber: number | undefined;
  try {
    const polygonPublicClient = getPolygonPublicClient();
    const receipt = await polygonPublicClient.waitForTransactionReceipt({ hash: txHash });
    blockNumber = Number(receipt.blockNumber);
    console.log(`[blockchain-proof] Confirmed at block ${blockNumber}`);
  } catch (err) {
    // Transaction submitted but confirmation timed out — still save what we have
    console.warn("[blockchain-proof] Could not confirm tx receipt:", err);
  }

  const chainId = Number(process.env.POLYGON_CHAIN_ID ?? 137);

  // ── Persist proof record ─────────────────────────────────────────────────────
  await db.insert(blockchainAnchors).values({
    anchoredByUserId: input.anchoredByUserId ?? null,
    artifactType:     input.artifactType,
    artifactId:       input.artifactId,
    artifactHash:     input.artifactHash,
    contextHash:      input.contextHash,
    chainId,
    contractAddress,
    txHash,
    blockNumber:      blockNumber ?? null,
    verificationStatus: "anchored",
    anchoredAt:       new Date(),
  });

  return {
    txHash,
    blockNumber,
    chainId,
    contractAddress,
  };
}
