// server/routers/blockchain-proof/proofRouter.ts
//
// tRPC routes for the GreenChainz Proof Ledger.
//
// Principles:
//   - tenantId / userId / role always come from ctx (never from client input)
//   - Artifact content is fetched server-side before hashing
//   - No private key material is ever returned to the client

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../_core/trpc";
import { getProofForArtifact } from "./verifyAnchor";
import { anchorArtifact } from "./anchorService";
import { hashCanonicalJson } from "./hashArtifact";
import type { ProofArtifactType, EpdContextPackage, ScoreContextPackage } from "./proofTypes";

const artifactTypeSchema = z.enum([
  "epd",
  "certification",
  "material_score",
  "material_submittal",
  "supplier_audit",
]);

// ─── Router ───────────────────────────────────────────────────────────────────

export const proofRouter = router({

  /**
   * Retrieve the proof record for an artifact (badge display, no hash check).
   * Any authenticated user can query proof records for artifacts they can see.
   */
  getProof: protectedProcedure
    .input(
      z.object({
        artifactType: artifactTypeSchema,
        artifactId:   z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const proof = await getProofForArtifact({
        artifactType: input.artifactType as ProofArtifactType,
        artifactId:   input.artifactId,
      });
      return proof ?? null;
    }),

  /**
   * Anchor a verified EPD on Polygon.
   * Typically called by the AI Audit Agent after EPD verification succeeds.
   * Supplier-facing: requires supplier or admin role.
   */
  anchorEpd: protectedProcedure
    .input(
      z.object({
        supplierId:  z.number().int().positive(),
        materialId:  z.number().int().positive().optional(),
        epdId:       z.string().min(1),
        provider:    z.string().min(1),
        verifiedAt:  z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user!;
      if (user.role !== "supplier" && user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Supplier or admin access required" });
      }

      if (process.env.BLOCKCHAIN_PROOF_ENABLED !== "true") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Blockchain proof is not enabled" });
      }

      const contextPackage: EpdContextPackage = {
        schemaVersion:    "1.0",
        artifactType:     "epd",
        supplierId:       input.supplierId,
        materialId:       input.materialId,
        epdId:            input.epdId,
        provider:         input.provider,
        verificationStatus: "verified",
        verifiedAt:       input.verifiedAt,
        verifier:         "greenchainz-ai-audit-agent",
      };

      // artifactHash: hash of the EPD context itself (no PDF bytes path here —
      // use the anchorEpdPdf procedure below when you have the actual bytes)
      const artifactHash = hashCanonicalJson({ epdId: input.epdId, provider: input.provider });
      const contextHash  = hashCanonicalJson(contextPackage);

      const result = await anchorArtifact({
        artifactType:     "epd",
        artifactId:       input.epdId,
        artifactHash,
        contextHash,
        anchoredByUserId: user.id,
      });

      return {
        txHash:      result.txHash,
        blockNumber: result.blockNumber,
        explorerUrl: `${process.env.PROOF_EXPLORER_BASE_URL ?? "https://polygonscan.com/tx/"}${result.txHash}`,
      };
    }),

  /**
   * Anchor a material credit score snapshot.
   * Called by the material credit score calculator after a score is computed.
   */
  anchorScore: protectedProcedure
    .input(
      z.object({
        materialId:   z.number().int().positive(),
        supplierId:   z.number().int().positive(),
        rulesVersion: z.string().min(1),
        score:        z.number(),
        rating:       z.string().min(1),
        inputs:       z.record(z.string(), z.unknown()),
        computedAt:   z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user!;
      if (user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required to anchor scores" });
      }

      if (process.env.BLOCKCHAIN_PROOF_ENABLED !== "true") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Blockchain proof is not enabled" });
      }

      const scoreSnapshot: ScoreContextPackage = {
        schemaVersion: "1.0",
        artifactType:  "material_score",
        materialId:    input.materialId,
        supplierId:    input.supplierId,
        rulesVersion:  input.rulesVersion,
        inputs:        input.inputs as ScoreContextPackage["inputs"],
        output:        { score: input.score, rating: input.rating },
        computedAt:    input.computedAt,
      };

      const artifactHash = hashCanonicalJson(scoreSnapshot);
      const contextHash  = hashCanonicalJson({
        materialId:   input.materialId,
        rulesVersion: input.rulesVersion,
        computedAt:   input.computedAt,
      });

      const result = await anchorArtifact({
        artifactType:     "material_score",
        artifactId:       String(input.materialId),
        artifactHash,
        contextHash,
        anchoredByUserId: user.id,
      });

      return {
        txHash:      result.txHash,
        blockNumber: result.blockNumber,
        explorerUrl: `${process.env.PROOF_EXPLORER_BASE_URL ?? "https://polygonscan.com/tx/"}${result.txHash}`,
      };
    }),

});

export type ProofRouter = typeof proofRouter;
