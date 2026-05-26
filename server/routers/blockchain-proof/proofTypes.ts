// server/routers/blockchain-proof/proofTypes.ts

export type ProofArtifactType =
  | "epd"
  | "certification"
  | "material_score"
  | "material_submittal"
  | "supplier_audit";

// Numeric values must match AnchorRegistry.sol
export const ARTIFACT_TYPE_IDS: Record<ProofArtifactType, number> = {
  epd:                1,
  certification:      2,
  material_score:     3,
  material_submittal: 4,
  supplier_audit:     5,
} as const;

export interface AnchorArtifactInput {
  artifactType:     ProofArtifactType;
  artifactId:       string;
  artifactHash:     `0x${string}`;
  contextHash:      `0x${string}`;
  anchoredByUserId?: number;
}

export interface AnchorArtifactResult {
  txHash:          `0x${string}`;
  blockNumber?:    number;
  chainId:         number;
  contractAddress: `0x${string}`;
}

export interface VerifyAnchorResult {
  verified:        boolean;
  artifactMatches: boolean;
  contextMatches:  boolean;
  reason:          string;
  txHash?:         string;
  chainId?:        number;
  contractAddress?: string;
  anchoredAt?:     Date;
  explorerUrl?:    string;
}

// EPD context package — hashed to produce contextHash
export interface EpdContextPackage {
  schemaVersion:    string;
  artifactType:     "epd";
  supplierId:       number;
  materialId?:      number;
  epdId:            string;
  provider:         string;
  verificationStatus: string;
  verifiedAt:       string; // ISO 8601
  verifier:         string;
}

// Material credit score context package
export interface ScoreContextPackage {
  schemaVersion:  string;
  artifactType:   "material_score";
  materialId:     number;
  supplierId:     number;
  rulesVersion:   string;
  inputs: {
    gwp?:              number;
    epdVerified?:      boolean;
    certifications?:   string[];
    supplierRiskScore?: number;
    distanceScore?:    number;
    complianceScore?:  number;
  };
  output: {
    score:  number;
    rating: string;
  };
  computedAt: string; // ISO 8601
}

// Approved submittal context package
export interface SubmittalContextPackage {
  schemaVersion:       string;
  artifactType:        "material_submittal";
  projectId:           number;
  materialId:          number;
  supplierId:          number;
  specSection:         string;
  approvedByUserId:    number;
  approvedAt:          string; // ISO 8601
  rulesVersion:        string;
  complianceFrameworks: string[];
}
