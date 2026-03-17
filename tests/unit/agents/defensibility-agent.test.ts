import { describe, it, expect } from 'vitest';
import {
  extractCertificates,
  extractEPDMetrics,
  extractHealthMetrics,
  checkLEEDCompliance,
  verifyCertificateDates,
  checkDefensibility,
  compareProducts,
  generateRejectionMemo,
  performDefensibilityCheck
} from '../../../lib/agents/defensibility-agent';
import type { ProductData } from '../../../lib/types/defensibility';

describe('defensibility-agent', () => {
  describe('extractCertificates', () => {
    it('should extract CDPH v1.2 information with standard formatting', () => {
      const content = `
        Certification: CDPH v1.2
        Certificate Number: CDPH-2024-001
        Issue Date: 01/15/2024
        Expiry Date: 01/15/2025
      `;
      const result = extractCertificates(content);
      expect(result.hasCDPHv12).toBe(true);
      expect(result.cdphCertificateNumber).toBe('CDPH-2024-001');
      expect(result.cdphIssueDate).toBe('01/15/2024');
      expect(result.cdphExpiryDate).toBe('01/15/2025');
    });

    it('should extract CDPH v1.2 with variations in spacing and case', () => {
      const content = `cdph version 1.2 cert # ABC-123. issued date: 12-31-2023. valid thru 12-31-2024`;
      const result = extractCertificates(content);
      expect(result.hasCDPHv12).toBe(true);
      expect(result.cdphCertificateNumber).toBe('ABC-123');
      expect(result.cdphIssueDate).toBe('12-31-2023');
      expect(result.cdphExpiryDate).toBe('12-31-2024');
    });

    it('should extract verified EPD information', () => {
      const content = `
        This is a third-party verified EPD.
        EPD Number: EPD-999
        Program Operator: EPD International
        Valid from: 2024/01/01
        Valid to: 2029/01/01
      `;
      const result = extractCertificates(content);
      expect(result.hasVerifiedEPD).toBe(true);
      expect(result.epdNumber).toBe('EPD-999');
      expect(result.epdProgramOperator).toBe('EPD International');
      expect(result.epdValidFrom).toBe('2024/01/01');
      expect(result.epdValidTo).toBe('2029/01/01');
    });

    it('should return default values when no certificates are found', () => {
      const content = 'No certifications listed here.';
      const result = extractCertificates(content);
      expect(result.hasCDPHv12).toBe(false);
      expect(result.hasVerifiedEPD).toBe(false);
    });

    it('should not mark EPD as verified if keyword is missing', () => {
      const content = 'Generic EPD number 123';
      const result = extractCertificates(content);
      expect(result.hasVerifiedEPD).toBe(false);
    });
  });

  describe('extractEPDMetrics', () => {
    it('should extract common environmental metrics', () => {
      const content = `
        GWP: 12.5 kg CO2 eq
        Acidification Potential: 0.05
        Eutrophication potential: 0.01
        Recycled Content: 25.5%
        Renewable content: 10%
      `;
      const result = extractEPDMetrics(content);
      expect(result.globalWarmingPotential).toBe(12.5);
      expect(result.gwpUnit).toBe('kg CO2 eq');
      expect(result.acidificationPotential).toBe(0.05);
      expect(result.eutrophicationPotential).toBe(0.01);
      expect(result.recycledContent).toBe(25.5);
      expect(result.renewableContent).toBe(10);
    });

    it('should handle GWP with different spacing', () => {
      const content = `Global Warming Potential: 8.2kgCO2`;
      const result = extractEPDMetrics(content);
      expect(result.globalWarmingPotential).toBe(8.2);
    });
  });

  describe('extractHealthMetrics', () => {
    it('should extract common health metrics', () => {
      const content = `
        Total VOC Emissions: 45.0 μg/m³
        Formaldehyde: 5.2 ug/m3
        Test Method: CDPH Standard Method V1.2
        Compliance: Pass
      `;
      const result = extractHealthMetrics(content);
      expect(result.vocEmissions).toBe(45.0);
      expect(result.formaldehydeEmissions).toBe(5.2);
      expect(result.testMethod).toBe('CDPH Standard Method V1.2');
      expect(result.compliance).toBe('Pass');
    });

    it('should handle Fail and Unknown compliance', () => {
      expect(extractHealthMetrics('Compliance: Fail').compliance).toBe('Fail');
      expect(extractHealthMetrics('Compliance: Meets standards').compliance).toBe('Pass');
      expect(extractHealthMetrics('Compliance: N/A').compliance).toBe('Unknown');
    });
  });

  describe('checkLEEDCompliance', () => {
    it('should identify LEED credits correctly', () => {
      const productData: ProductData = {
        productName: 'Test',
        manufacturer: 'Test',
        certificates: { hasCDPHv12: true, hasVerifiedEPD: true },
        epdMetrics: { recycledContent: 20 },
        healthMetrics: { compliance: 'Pass' }
      };
      const credits = checkLEEDCompliance(productData);
      expect(credits).toContain('LEED v4.1 MRc2: Environmental Product Declarations (EPD)');
      expect(credits).toContain('LEED v4.1 MRc3: Sourcing of Raw Materials (Recycled Content)');
      expect(credits).toContain('LEED v4.1 EQc2: Low-Emitting Materials');
    });

    it('should return empty array if no credits met', () => {
      const productData: ProductData = {
        productName: 'Test',
        manufacturer: 'Test',
        certificates: { hasCDPHv12: false, hasVerifiedEPD: false },
        epdMetrics: {},
        healthMetrics: { compliance: 'Unknown' }
      };
      const credits = checkLEEDCompliance(productData);
      expect(credits.length).toBe(0);
    });
  });

  describe('verifyCertificateDates', () => {
    it('should identify expired certificates', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000).toLocaleDateString(); // Yesterday
      const futureDate = new Date(now.getTime() + 86400000).toLocaleDateString(); // Tomorrow

      const certs = {
        hasCDPHv12: true,
        cdphExpiryDate: pastDate,
        hasVerifiedEPD: true,
        epdValidTo: futureDate
      };

      const issues = verifyCertificateDates(certs);
      expect(issues.length).toBe(1);
      expect(issues[0]).toContain('CDPH certificate expired');
    });

    it('should handle valid certificates', () => {
      const futureDate = new Date(Date.now() + 1000000000).toLocaleDateString();
      const certs = {
        hasCDPHv12: true,
        cdphExpiryDate: futureDate,
        hasVerifiedEPD: true,
        epdValidTo: futureDate
      };
      const issues = verifyCertificateDates(certs);
      expect(issues.length).toBe(0);
    });
  });

  describe('checkDefensibility', () => {
    it('should calculate high score for compliant product', () => {
      const productData: ProductData = {
        productName: 'EcoGood',
        manufacturer: 'GreenCo',
        certificates: { hasCDPHv12: true, hasVerifiedEPD: true },
        epdMetrics: { globalWarmingPotential: 5, gwpUnit: 'kg CO2 eq', recycledContent: 40 },
        healthMetrics: { vocEmissions: 10, compliance: 'Pass' }
      };
      const result = checkDefensibility(productData);
      expect(result.isDefensible).toBe(true);
      expect(result.defensibilityScore).toBeGreaterThanOrEqual(60);
      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.vulnerabilities.length).toBe(0);
    });

    it('should identify vulnerabilities for non-compliant product', () => {
      const productData: ProductData = {
        productName: 'BadStuff',
        manufacturer: 'DirtyCo',
        certificates: { hasCDPHv12: false, hasVerifiedEPD: false },
        epdMetrics: {},
        healthMetrics: { compliance: 'Fail' }
      };
      const result = checkDefensibility(productData);
      expect(result.isDefensible).toBe(false);
      expect(result.vulnerabilities).toContain('Failed compliance testing');
      expect(result.missingRequirements).toContain('CDPH v1.2 certificate');
    });
  });

  describe('compareProducts', () => {
    const original: ProductData = {
      productName: 'Original',
      manufacturer: 'OrigCo',
      certificates: { hasCDPHv12: true, hasVerifiedEPD: true },
      epdMetrics: { globalWarmingPotential: 10 },
      healthMetrics: { vocEmissions: 50, compliance: 'Pass' }
    };

    it('should reject substitute with higher GWP and VOC', () => {
      const substitute: ProductData = {
        productName: 'Sub',
        manufacturer: 'SubCo',
        certificates: { hasCDPHv12: true, hasVerifiedEPD: true },
        epdMetrics: { globalWarmingPotential: 15 },
        healthMetrics: { vocEmissions: 100, compliance: 'Pass' }
      };
      const result = compareProducts(original, substitute);
      expect(result.overallVerdict).toBe('Reject');
      expect(result.reasons).toContain('Substitute has 50.0% higher carbon footprint');
      expect(result.reasons).toContain('Substitute has higher VOC emissions (+50.0 μg/m³)');
    });

    it('should accept equivalent substitute', () => {
      const substitute: ProductData = {
        ...original,
        productName: 'EqualSub'
      };
      const result = compareProducts(original, substitute);
      expect(result.overallVerdict).toBe('Acceptable');
      expect(result.reasons.length).toBe(0);
    });
  });

  describe('generateRejectionMemo', () => {
    it('should generate a structured memo', () => {
      const original: ProductData = {
        productName: 'Original',
        manufacturer: 'OrigCo',
        certificates: { hasCDPHv12: true, hasVerifiedEPD: true },
        epdMetrics: { globalWarmingPotential: 10 },
        healthMetrics: { vocEmissions: 50, compliance: 'Pass' }
      };
      const substitute: ProductData = {
        productName: 'Sub',
        manufacturer: 'SubCo',
        certificates: { hasCDPHv12: true, hasVerifiedEPD: true },
        epdMetrics: { globalWarmingPotential: 20 },
        healthMetrics: { vocEmissions: 50, compliance: 'Pass' }
      };
      const comparison = compareProducts(original, substitute);
      const memo = generateRejectionMemo(comparison, {
        projectName: 'Green Project',
        specSection: '09 00 00',
        architect: 'Archie Tect'
      });

      expect(memo.title).toBe('Product Substitution Rejection Notice');
      expect(memo.projectName).toBe('Green Project');
      expect(memo.rejectionReasons.length).toBeGreaterThan(0);
      expect(memo.carbonImpact).toContain('100.0% higher carbon footprint');
      expect(memo.architectSignature.name).toBe('Archie Tect');
    });
  });

  describe('performDefensibilityCheck', () => {
    it('should perform end-to-end check from document content', () => {
      const content = `
        This product is CDPH v1.2 certified.
        Certificate #CDPH-123.
        Third-party verified EPD included.
        GWP: 5.5 kg CO2 eq.
        VOC emissions: 20 μg/m³.
        Compliance: Pass.
      `;
      const result = performDefensibilityCheck(content, 'EcoBoard', 'GreenLife');

      expect(result.productData.productName).toBe('EcoBoard');
      expect(result.productData.certificates.hasCDPHv12).toBe(true);
      expect(result.productData.certificates.hasVerifiedEPD).toBe(true);
      expect(result.productData.epdMetrics.globalWarmingPotential).toBe(5.5);
      expect(result.isDefensible).toBe(true);
    });
  });
});
