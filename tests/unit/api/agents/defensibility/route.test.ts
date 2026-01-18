import { POST, GET } from '@/app/api/agents/defensibility/route';
import { NextRequest } from 'next/server';
import type { ProductData } from '@/lib/types/defensibility';

describe('POST /api/agents/defensibility - check action', () => {
  it('should perform defensibility check on document content', async () => {
    const request = new NextRequest('http://localhost/api/agents/defensibility', {
      method: 'POST',
      body: JSON.stringify({
        action: 'check',
        documentContent: `
          This product has CDPH v1.2 certification.
          Certificate number: CDPH-2024-001. Issue date: 01/15/2024.
          Third-party verified EPD available. EPD Number: EPD-12345.
          GWP: 5.2 kg CO2 eq per unit. VOC emissions: 50 μg/m³.
          Compliance: Pass. Recycled content: 30%.
        `,
        productName: 'EcoPanel 500',
        manufacturer: 'GreenTech Industries',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.productData).toBeDefined();
    expect(data.productData.productName).toBe('EcoPanel 500');
    expect(data.productData.manufacturer).toBe('GreenTech Industries');
    expect(data.defensibilityScore).toBeGreaterThan(0);
    expect(typeof data.isDefensible).toBe('boolean');
    expect(Array.isArray(data.strengths)).toBe(true);
    expect(Array.isArray(data.vulnerabilities)).toBe(true);
    expect(Array.isArray(data.recommendations)).toBe(true);
  });

  it('should return 400 if action is missing', async () => {
    const request = new NextRequest('http://localhost/api/agents/defensibility', {
      method: 'POST',
      body: JSON.stringify({
        documentContent: 'Some content',
        productName: 'Test',
        manufacturer: 'Test Co',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('action');
  });

  it('should return 400 if check action is missing required fields', async () => {
    const request = new NextRequest('http://localhost/api/agents/defensibility', {
      method: 'POST',
      body: JSON.stringify({
        action: 'check',
        documentContent: 'Some content',
        // missing productName and manufacturer
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('productName');
  });
});

describe('POST /api/agents/defensibility - compare action', () => {
  const originalProduct: ProductData = {
    productName: 'EcoPanel Original',
    manufacturer: 'GreenTech',
    certificates: {
      hasCDPHv12: true,
      hasVerifiedEPD: true,
      cdphCertificateNumber: 'CDPH-001',
      epdNumber: 'EPD-001',
    },
    epdMetrics: {
      globalWarmingPotential: 5.0,
      gwpUnit: 'kg CO2 eq',
      recycledContent: 30,
    },
    healthMetrics: {
      vocEmissions: 50,
      formaldehydeEmissions: 10,
      compliance: 'Pass',
    },
  };

  const substituteProduct: ProductData = {
    productName: 'CheapPanel Substitute',
    manufacturer: 'BudgetCorp',
    certificates: {
      hasCDPHv12: false,
      hasVerifiedEPD: false,
    },
    epdMetrics: {
      globalWarmingPotential: 8.0,
      gwpUnit: 'kg CO2 eq',
    },
    healthMetrics: {
      vocEmissions: 80,
      formaldehydeEmissions: 25,
      compliance: 'Unknown',
    },
  };

  it('should compare products and return Reject verdict', async () => {
    const request = new NextRequest('http://localhost/api/agents/defensibility', {
      method: 'POST',
      body: JSON.stringify({
        action: 'compare',
        original: originalProduct,
        substitute: substituteProduct,
        projectContext: {
          projectName: 'Green Office Building',
          specSection: '09 29 00',
          architect: 'Jane Smith',
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.verdict).toBe('Reject');
    expect(data.comparison).toBeDefined();
    expect(data.comparison.overallVerdict).toBe('Reject');
    expect(data.rejectionMemo).toBeDefined();
    expect(data.rejectionMemo.originalProduct).toContain('EcoPanel Original');
    expect(data.rejectionMemo.substituteProduct).toContain('CheapPanel Substitute');
  });

  it('should compare equivalent products and return Acceptable verdict', async () => {
    const equivalentSubstitute: ProductData = {
      ...originalProduct,
      productName: 'EcoPanel Equivalent',
      manufacturer: 'OtherGreenTech',
    };

    const request = new NextRequest('http://localhost/api/agents/defensibility', {
      method: 'POST',
      body: JSON.stringify({
        action: 'compare',
        original: originalProduct,
        substitute: equivalentSubstitute,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.verdict).toBe('Acceptable');
    expect(data.rejectionMemo).toBeUndefined();
  });

  it('should return 400 if original product is missing', async () => {
    const request = new NextRequest('http://localhost/api/agents/defensibility', {
      method: 'POST',
      body: JSON.stringify({
        action: 'compare',
        substitute: substituteProduct,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('original');
  });

  it('should return 400 if product data is invalid', async () => {
    const request = new NextRequest('http://localhost/api/agents/defensibility', {
      method: 'POST',
      body: JSON.stringify({
        action: 'compare',
        original: { productName: 'Test' }, // incomplete
        substitute: substituteProduct,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('incomplete or invalid');
  });
});

describe('GET /api/agents/defensibility', () => {
  it('should return API documentation', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.endpoint).toBe('/api/agents/defensibility');
    expect(data.actions.check).toBeDefined();
    expect(data.actions.compare).toBeDefined();
    expect(data.verdicts).toContain('Acceptable');
    expect(data.verdicts).toContain('Reject');
    expect(data.verdicts).toContain('Review');
  });
});
