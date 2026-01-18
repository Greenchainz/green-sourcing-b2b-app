import { POST, GET } from '@/app/api/agents/decision-logic/route';
import { NextRequest } from 'next/server';

describe('POST /api/agents/decision-logic', () => {
  it('should extract decision logic from flooring content', async () => {
    const request = new NextRequest('http://localhost/api/agents/decision-logic', {
      method: 'POST',
      body: JSON.stringify({
        documentContent: `
          This is a vinyl flooring product with strip-free maintenance.
          The floor tile requires polish only cleaning and is adhesive-free.
          Click-lock installation system. Maintenance cycle: every 12 months.
        `,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.materialCategory).toBe('Flooring');
    expect(data.targetRoles).toContain('Facility Manager');
    expect(data.decisionCriteria.maintenanceRequirements).toBeDefined();
    expect(data.decisionCriteria.maintenanceRequirements.noStripping).toBe(true);
    expect(data.relevanceScore).toBeDefined();
  });

  it('should extract decision logic from insulation content', async () => {
    const request = new NextRequest('http://localhost/api/agents/decision-logic', {
      method: 'POST',
      body: JSON.stringify({
        documentContent: `
          This mineral wool insulation product is non-combustible.
          Fire resistance rating: 2 hours. Class A fire rating.
          Flame spread index: 0. Smoke developed index: 5.
        `,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.materialCategory).toBe('Insulation');
    expect(data.targetRoles).toContain('Insurance Risk Manager');
    expect(data.decisionCriteria.fireResistanceData).toBeDefined();
    expect(data.decisionCriteria.fireResistanceData.nonCombustible).toBe(true);
    expect(data.decisionCriteria.fireResistanceData.mineralWool).toBe(true);
  });

  it('should extract decision logic from structural content', async () => {
    const request = new NextRequest('http://localhost/api/agents/decision-logic', {
      method: 'POST',
      body: JSON.stringify({
        documentContent: `
          Lightweight gypsum board for drywall installation.
          Fast installation with reduced labor. Weight: 1.2 lbs per sq ft.
          Installation speed is key benefit for contractors.
        `,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.materialCategory).toBe('Structure');
    expect(data.targetRoles).toContain('Drywall Subcontractor');
    expect(data.decisionCriteria.installationData).toBeDefined();
    expect(data.decisionCriteria.installationData.lightweight).toBe(true);
  });

  it('should use provided material category when specified', async () => {
    const request = new NextRequest('http://localhost/api/agents/decision-logic', {
      method: 'POST',
      body: JSON.stringify({
        documentContent: 'Some generic product content without specific keywords.',
        materialCategory: 'Flooring',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.materialCategory).toBe('Flooring');
  });

  it('should return 400 if documentContent is missing', async () => {
    const request = new NextRequest('http://localhost/api/agents/decision-logic', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('documentContent');
  });

  it('should return 400 if documentContent is too short', async () => {
    const request = new NextRequest('http://localhost/api/agents/decision-logic', {
      method: 'POST',
      body: JSON.stringify({
        documentContent: 'Short',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('too short');
  });
});

describe('GET /api/agents/decision-logic', () => {
  it('should return API documentation', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.endpoint).toBe('/api/agents/decision-logic');
    expect(data.supportedCategories).toContain('Flooring');
    expect(data.supportedCategories).toContain('Insulation');
    expect(data.supportedCategories).toContain('Facade');
    expect(data.supportedCategories).toContain('Structure');
  });
});
