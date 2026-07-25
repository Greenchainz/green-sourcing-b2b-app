// server/routers/blockchain-proof/verifyAnchor.ts
//
// Recompute artifact and context hashes, compare against stored proof record,
// and return a structured verification result.

import { eq, and } from "drizzle-orm";
import { getDb } from "../../db";
import { blockchainAnchors } from "../../../drizzle/schema";
import { explorerUrl } from "./polygonClient";
import type { ProofArtifactType, VerifyAnchorResult } from "./proofTypes";

/**
 * Verify an artifact against its stored blockchain proof.
 *
 * Pass the current artifact and context hashes (freshly computed server-side).
 * Returns whether they match the anchored record, plus the explorer URL.
 */
export async function verifyStoredAnchor(params: {
  artifactType:        ProofArtifactType;
  artifactId:          string;
  currentArtifactHash: `0x${string}`;
  currentContextHash:  `0x${string}`;
}): Promise<VerifyAnchorResult> {
  const db = await getDb();
  if (!db) {
    return {
      verified:        false,
      artifactMatches: false,
      contextMatches:  false,
      reason:          "Database unavailable",
    };
  }

  const rows = await db
    .select()
    .from(blockchainAnchors)
    .where(
      and(
        eq(blockchainAnchors.artifactType, params.artifactType),
        eq(blockchainAnchors.artifactId,   params.artifactId)
      )
    )
    .limit(1);

  const anchor = rows[0];

  if (!anchor) {
    return {
      verified:        false,
      artifactMatches: false,
      contextMatches:  false,
      reason:          "No blockchain proof record found for this artifact",
    };
  }

  const artifactMatches =
    anchor.artifactHash.toLowerCase() === params.currentArtifactHash.toLowerCase();
  const contextMatches =
    anchor.contextHash.toLowerCase() === params.currentContextHash.toLowerCase();

  const verified = artifactMatches && contextMatches;

  return {
    verified,
    artifactMatches,
    contextMatches,
    txHash:          anchor.txHash,
    chainId:         anchor.chainId,
    contractAddress: anchor.contractAddress,
    anchoredAt:      anchor.anchoredAt,
    explorerUrl:     explorerUrl(anchor.txHash),
    reason:          verified
      ? "Artifact matches the anchored blockchain proof"
      : artifactMatches
        ? "Artifact content matches but context/metadata does not"
        : "Artifact no longer matches its anchored proof — possible tampering detected",
  };
}

/**
 * Retrieve the most recent proof record for an artifact (read-only, no hash check).
 * Used to show the badge state when you don't have the artifact content on hand.
 */
export async function getProofForArtifact(params: {
  artifactType: ProofArtifactType;
  artifactId:   string;
}) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(blockchainAnchors)
    .where(
      and(
        eq(blockchainAnchors.artifactType, params.artifactType),
        eq(blockchainAnchors.artifactId,   params.artifactId)
      )
    )
    .limit(1);

  const anchor = rows[0];
  if (!anchor) return null;

  return {
    id:                 anchor.id,
    artifactType:       anchor.artifactType,
    artifactId:         anchor.artifactId,
    txHash:             anchor.txHash,
    blockNumber:        anchor.blockNumber,
    chainId:            anchor.chainId,
    contractAddress:    anchor.contractAddress,
    verificationStatus: anchor.verificationStatus,
    anchoredAt:         anchor.anchoredAt,
    explorerUrl:        explorerUrl(anchor.txHash),
  };
}
