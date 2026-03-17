import { Supplier, MaterialCertification } from "../drizzle/schema";

/**
 * Compliance Check Result for a single item
 */
export interface ComplianceCheckResult {
  id: string;
  type: "epd" | "certification" | "sustainability";
  name: string;
  status: "pass" | "warning" | "critical";
  message: string;
  expiryDate?: Date;
  daysUntilExpiry?: number;
  riskScore: number; // 0-100, higher = more risk
}

/**
 * Overall supplier compliance report
 */
export interface SupplierComplianceReport {
  supplierId: number;
  overallRiskScore: number; // 0-100, weighted average
  riskLevel: "low" | "medium" | "high" | "critical";
  checks: ComplianceCheckResult[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    warningChecks: number;
    criticalChecks: number;
  };
  recommendations: string[];
}

/**
 * Calculate days until expiry
 */
export function calculateDaysUntilExpiry(expiryDate: Date | null | undefined): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determine EPD expiry status
 */
export function getEpdExpiryStatus(expiryDate: Date | null | undefined): "pass" | "warning" | "critical" {
  if (!expiryDate) return "warning"; // No expiry date is a warning
  
  const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate);
  if (daysUntilExpiry === null) return "warning";
  
  if (daysUntilExpiry < 0) return "critical"; // Expired
  if (daysUntilExpiry < 90) return "warning"; // Less than 3 months
  return "pass"; // More than 3 months
}

/**
 * Calculate risk score for EPD expiry
 * Returns 0-100 where 100 is highest risk
 */
export function calculateEpdRiskScore(expiryDate: Date | null | undefined): number {
  if (!expiryDate) return 30; // No expiry date = moderate risk
  
  const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate);
  if (daysUntilExpiry === null) return 30;
  
  if (daysUntilExpiry < 0) return 100; // Expired = critical risk
  if (daysUntilExpiry < 30) return 85; // Less than 1 month
  if (daysUntilExpiry < 90) return 60; // Less than 3 months
  if (daysUntilExpiry < 180) return 40; // Less than 6 months
  if (daysUntilExpiry < 365) return 20; // Less than 1 year
  return 5; // More than 1 year = low risk
}

/**
 * Determine certification expiry status
 */
export function getCertificationExpiryStatus(
  expirationDate: Date | null | undefined
): "pass" | "warning" | "critical" {
  if (!expirationDate) return "warning"; // No expiry date is a warning
  
  const daysUntilExpiry = calculateDaysUntilExpiry(expirationDate);
  if (daysUntilExpiry === null) return "warning";
  
  if (daysUntilExpiry < 0) return "critical"; // Expired
  if (daysUntilExpiry < 60) return "warning"; // Less than 2 months
  return "pass"; // More than 2 months
}

/**
 * Calculate risk score for certification expiry
 */
export function calculateCertificationRiskScore(expirationDate: Date | null | undefined): number {
  if (!expirationDate) return 25; // No expiry date = low-moderate risk
  
  const daysUntilExpiry = calculateDaysUntilExpiry(expirationDate);
  if (daysUntilExpiry === null) return 25;
  
  if (daysUntilExpiry < 0) return 100; // Expired = critical risk
  if (daysUntilExpiry < 30) return 80; // Less than 1 month
  if (daysUntilExpiry < 60) return 60; // Less than 2 months
  if (daysUntilExpiry < 180) return 35; // Less than 6 months
  if (daysUntilExpiry < 365) return 15; // Less than 1 year
  return 5; // More than 1 year = low risk
}

/**
 * Validate supplier sustainability score
 */
export function validateSustainabilityScore(score: number | string | null | undefined): ComplianceCheckResult {
  const numScore = score ? parseFloat(score.toString()) : 0;
  
  let status: "pass" | "warning" | "critical";
  let riskScore: number;
  let message: string;
  
  if (numScore >= 75) {
    status = "pass";
    riskScore = 10;
    message = `Strong sustainability score: ${numScore}/100`;
  } else if (numScore >= 50) {
    status = "warning";
    riskScore = 45;
    message = `Moderate sustainability score: ${numScore}/100. Consider requesting improvement plan.`;
  } else {
    status = "critical";
    riskScore = 80;
    message = `Low sustainability score: ${numScore}/100. Recommend requesting remediation.`;
  }
  
  return {
    id: "sustainability",
    type: "sustainability",
    name: "Sustainability Score",
    status,
    message,
    riskScore,
  };
}

/**
 * Check material EPDs for expiry
 */
export function checkMaterialEpds(
  materials: Array<{ id: number; name: string; epdExpiry?: Date | null }>
): ComplianceCheckResult[] {
  return materials.map((material) => {
    const status = getEpdExpiryStatus(material.epdExpiry);
    const daysUntilExpiry = calculateDaysUntilExpiry(material.epdExpiry);
    const riskScore = calculateEpdRiskScore(material.epdExpiry);
    
    let message: string;
    if (!material.epdExpiry) {
      message = `No EPD expiry date found for ${material.name}`;
    } else if (daysUntilExpiry && daysUntilExpiry < 0) {
      message = `EPD expired ${Math.abs(daysUntilExpiry)} days ago`;
    } else if (daysUntilExpiry && daysUntilExpiry < 90) {
      message = `EPD expires in ${daysUntilExpiry} days`;
    } else {
      message = `EPD valid until ${material.epdExpiry.toLocaleDateString()}`;
    }
    
    return {
      id: `epd-${material.id}`,
      type: "epd",
      name: `EPD: ${material.name}`,
      status,
      message,
      expiryDate: material.epdExpiry || undefined,
      daysUntilExpiry: daysUntilExpiry || undefined,
      riskScore,
    };
  });
}

/**
 * Check material certifications for expiry
 */
export function checkMaterialCertifications(
  certifications: MaterialCertification[]
): ComplianceCheckResult[] {
  return certifications.map((cert) => {
    const status = getCertificationExpiryStatus(cert.expirationDate);
    const daysUntilExpiry = calculateDaysUntilExpiry(cert.expirationDate);
    const riskScore = calculateCertificationRiskScore(cert.expirationDate);
    
    let message: string;
    if (!cert.expirationDate) {
      message = `No expiry date for ${cert.certificationName || cert.certificationType}`;
    } else if (daysUntilExpiry && daysUntilExpiry < 0) {
      message = `${cert.certificationName || cert.certificationType} expired ${Math.abs(daysUntilExpiry)} days ago`;
    } else if (daysUntilExpiry && daysUntilExpiry < 60) {
      message = `${cert.certificationName || cert.certificationType} expires in ${daysUntilExpiry} days`;
    } else {
      message = `${cert.certificationName || cert.certificationType} valid until ${cert.expirationDate.toLocaleDateString()}`;
    }
    
    return {
      id: `cert-${cert.id}`,
      type: "certification",
      name: cert.certificationName || cert.certificationType,
      status,
      message,
      expiryDate: cert.expirationDate || undefined,
      daysUntilExpiry: daysUntilExpiry || undefined,
      riskScore,
    };
  });
}

/**
 * Generate supplier compliance report
 */
export function generateComplianceReport(
  supplier: Supplier,
  materials: Array<{ id: number; name: string; epdExpiry?: Date | null }>,
  certifications: MaterialCertification[]
): SupplierComplianceReport {
  const checks: ComplianceCheckResult[] = [];
  
  // Add sustainability score check
  checks.push(validateSustainabilityScore(supplier.sustainabilityScore));
  
  // Add EPD checks
  checks.push(...checkMaterialEpds(materials));
  
  // Add certification checks
  checks.push(...checkMaterialCertifications(certifications));
  
  // Calculate summary
  const summary = {
    totalChecks: checks.length,
    passedChecks: checks.filter((c) => c.status === "pass").length,
    warningChecks: checks.filter((c) => c.status === "warning").length,
    criticalChecks: checks.filter((c) => c.status === "critical").length,
  };
  
  // Calculate overall risk score (weighted average)
  const totalRiskScore = checks.reduce((sum, check) => sum + check.riskScore, 0);
  const overallRiskScore = Math.round(totalRiskScore / checks.length);
  
  // Determine risk level
  let riskLevel: "low" | "medium" | "high" | "critical";
  if (overallRiskScore >= 70) {
    riskLevel = "critical";
  } else if (overallRiskScore >= 50) {
    riskLevel = "high";
  } else if (overallRiskScore >= 30) {
    riskLevel = "medium";
  } else {
    riskLevel = "low";
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (summary.criticalChecks > 0) {
    recommendations.push("⚠️ CRITICAL: Address expired certifications/EPDs before approval");
  }
  
  if (summary.warningChecks > 0) {
    recommendations.push("📋 Request supplier to renew certifications/EPDs expiring soon");
  }
  
  if (overallRiskScore >= 50) {
    recommendations.push("🔍 Conduct additional due diligence before approval");
  }
  
  const sustainabilityScore = supplier.sustainabilityScore ? parseFloat(supplier.sustainabilityScore.toString()) : 0;
  if (sustainabilityScore > 0 && sustainabilityScore < 50) {
    recommendations.push("🌱 Request sustainability improvement plan from supplier");
  }
  
  if (summary.passedChecks === summary.totalChecks) {
    recommendations.push("✅ All compliance checks passed - supplier ready for approval");
  }
  
  return {
    supplierId: supplier.id,
    overallRiskScore,
    riskLevel,
    checks,
    summary,
    recommendations,
  };
}

/**
 * Format compliance check for display
 */
export function formatComplianceCheck(check: ComplianceCheckResult): {
  icon: string;
  color: string;
  statusText: string;
} {
  const statusMap = {
    pass: { icon: "✓", color: "text-green-600", statusText: "Pass" },
    warning: { icon: "⚠", color: "text-yellow-600", statusText: "Warning" },
    critical: { icon: "✕", color: "text-red-600", statusText: "Critical" },
  };
  
  return statusMap[check.status];
}

/**
 * Format risk level for display
 */
export function formatRiskLevel(riskLevel: string): {
  icon: string;
  color: string;
  bgColor: string;
  label: string;
} {
  const riskMap = {
    low: {
      icon: "✓",
      color: "text-green-700",
      bgColor: "bg-green-50",
      label: "Low Risk",
    },
    medium: {
      icon: "⚠",
      color: "text-yellow-700",
      bgColor: "bg-yellow-50",
      label: "Medium Risk",
    },
    high: {
      icon: "⚠",
      color: "text-orange-700",
      bgColor: "bg-orange-50",
      label: "High Risk",
    },
    critical: {
      icon: "✕",
      color: "text-red-700",
      bgColor: "bg-red-50",
      label: "Critical Risk",
    },
  };
  
  return riskMap[riskLevel as keyof typeof riskMap] || riskMap.medium;
}
