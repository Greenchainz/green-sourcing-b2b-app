import { POST, GET } from '@/app/api/agents/orchestrate/route';
import { NextRequest } from 'next/server';

describe('POST /api/agents/orchestrate', () => {
  const sampleDocumentContent = `
    This is a vinyl flooring product with no-stripping maintenance.
    CDPH v1.2 certified. Certificate: CDPH-2024-001.
    Third-party verified EPD available. EPD Number: EPD-001.
    GWP: 4.5 kg CO2 eq. VOC emissions: 45 μg/m³.
    Compliance: Pass. Recycled content: 25%.
    The floor tile requires polish only cleaning and is adhesive-free.
  `;

  it('should orchestrate all agents by default', async () => {
    const request = new NextRequest('http://localhost/api/agents/orchestrate', {
      method: 'POST',
      body: JSON.stringify({
        documentContent: sampleDocumentContent,
        productName: 'EcoFloor LVT',
        manufacturer: 'GreenBuild Inc',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.product.name).toBe('EcoFloor LVT');
    expect(data.product.manufacturer).toBe('GreenBuild Inc');
    
    // Should have results from all agents
    expect(data.decisionLogic).toBeDefined();
    expect(data.defensibility).toBeDefined();
    expect(data.extraction).toBeDefined();
    
    // Check decision logic results
    expect(data.decisionLogic.materialCategory).toBe('Flooring');
    
    // Check defensibility results
    expect(typeof data.defensibility.isDefensible).toBe('boolean');
    expect(typeof data.defensibility.defensibilityScore).toBe('number');
    
    // Check extraction results
    expect(data.extraction.certificates).toBeDefined();
    expect(data.extraction.epdMetrics).toBeDefined();
    expect(data.extraction.healthMetrics).toBeDefined();
    
    // Check metadata
    expect(data.metadata.agentsRun).toContain('decision-logic');
    expect(data.metadata.agentsRun).toContain('defensibility');
    expect(data.metadata.agentsRun).toContain('extraction');
    expect(data.metadata.processingTimeMs).toBeGreaterThan(0);
    
    // Check overall assessment
    expect(data.overallAssessment).toBeDefined();
    expect(typeof data.overallAssessment.isDefensible).toBe('boolean');
    expect(data.overallAssessment.relevanceScore).toBeDefined();
    
    // Check recommendations
    expect(Array.isArray(data.recommendations)).toBe(true);
  });

  it('should run only specified agents', async () => {
    const request = new NextRequest('http://localhost/api/agents/orchestrate', {
      method: 'POST',
      body: JSON.stringify({
        documentContent: sampleDocumentContent,
        productName: 'EcoFloor LVT',
        manufacturer: 'GreenBuild Inc',
        agents: ['decision-logic'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.decisionLogic).toBeDefined();
    expect(data.defensibility).toBeUndefined();
    expect(data.extraction).toBeUndefined();
    expect(data.metadata.agentsRun).toContain('decision-logic');
    expect(data.metadata.agentsRun).not.toContain('defensibility');
  });

  it('should run multiple specified agents', async () => {
    const request = new NextRequest('http://localhost/api/agents/orchestrate', {
      method: 'POST',
      body: JSON.stringify({
        documentContent: sampleDocumentContent,
        productName: 'EcoFloor LVT',
        manufacturer: 'GreenBuild Inc',
        agents: ['defensibility', 'extraction'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.decisionLogic).toBeUndefined();
    expect(data.defensibility).toBeDefined();
    expect(data.extraction).toBeDefined();
  });

  it('should return 400 if documentContent is missing', async () => {
    const request = new NextRequest('http://localhost/api/agents/orchestrate', {
      method: 'POST',
      body: JSON.stringify({
        productName: 'Test',
        manufacturer: 'Test Co',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('documentContent');
  });

  it('should return 400 if productName is missing', async () => {
    const request = new NextRequest('http://localhost/api/agents/orchestrate', {
      method: 'POST',
      body: JSON.stringify({
        documentContent: sampleDocumentContent,
        manufacturer: 'Test Co',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('productName');
  });

  it('should return 400 if manufacturer is missing', async () => {
    const request = new NextRequest('http://localhost/api/agents/orchestrate', {
      method: 'POST',
      body: JSON.stringify({
        documentContent: sampleDocumentContent,
        productName: 'Test',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('manufacturer');
  });
});

describe('GET /api/agents/orchestrate', () => {
  it('should return API documentation', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.endpoint).toBe('/api/agents/orchestrate');
    expect(data.availableAgents).toBeDefined();
    expect(data.availableAgents['decision-logic']).toBeDefined();
    expect(data.availableAgents['defensibility']).toBeDefined();
    expect(data.availableAgents['extraction']).toBeDefined();
    expect(data.requestBody).toBeDefined();
    expect(data.responseFormat).toBeDefined();
  });
});
