// GreenChainz material as returned by the public API
export interface GCMaterial {
  id: string;
  name: string;
  category: string;
  manufacturer?: string;
  gwpPerUnit?: number;       // kgCO2e per declared unit
  gwpUnit?: string;          // e.g. "kg", "m3", "m2"
  materialCreditScore?: number; // 0-100
  certifications?: string[]; // ["LEED", "FSC", "GreenGuard", ...]
  ec3Id?: string;
  epdUrl?: string;
  isVerified?: boolean;
}

// Lightweight result from carbon analysis
export interface CarbonSnapshot {
  totalGwp: number;          // kgCO2e
  materialBreakdown: Array<{
    name: string;
    gwp: number;
    percentage: number;
  }>;
}

// RFQ item being built inside Forma
export interface FormaRfqItem {
  materialId: string;
  materialName: string;
  quantity?: number;
  unit?: string;
  projectPath?: string;      // Forma element path
}
