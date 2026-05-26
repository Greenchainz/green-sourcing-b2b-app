// server/routers/blockchain-proof/hashArtifact.ts
//
// keccak256 hashing helpers — EVM-compatible, reproducible.
// viem's keccak256 + toBytes handles all encoding correctly.

import { keccak256, toBytes } from "viem";
import { canonicalize } from "./canonicalize";

/**
 * Hash a canonical JSON value (EPD context, score snapshot, metadata package).
 * Always sort keys before hashing to guarantee stability.
 */
export function hashCanonicalJson(value: unknown): `0x${string}` {
  return keccak256(toBytes(canonicalize(value)));
}

/**
 * Hash raw bytes (e.g. a PDF document buffer).
 */
export function hashBuffer(buffer: Buffer | Uint8Array): `0x${string}` {
  return keccak256(buffer instanceof Buffer ? new Uint8Array(buffer) : buffer);
}

/**
 * Hash a plain string (e.g. an EPD number or URL).
 */
export function hashString(value: string): `0x${string}` {
  return keccak256(toBytes(value));
}
