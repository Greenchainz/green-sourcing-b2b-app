import { POST } from '@/app/api/submittals/assemblies/report/route';
import { NextRequest } from 'next/server';
import type { AssemblyReportPayload } from '@/app/api/submittals/assemblies/report/route';

const baseAssemblies: AssemblyReportPayload['assemblies'] = [
  {
    assemblyId: 'EWS-01',
    description: 'Insulated glass curtain wall',
    manufacturer: 'Kawneer',
    epdNumber: 'EPD-12345',
    gwpPerFunctionalUnit: 12.5,
    msfFactor: 1.0,
    totalKgCO2ePer1000SF: 12500,
  },
  {
    assemblyId: 'EWS-02',
    epdNumber: 'EPD-67890',
    gwpPerFunctionalUnit: 8.0,
    msfFactor: 0.85,
    totalKgCO2ePer1000SF: 6800,
  },
  {
    assemblyId: 'EWS-03',
    description: 'Aluminum spandrel panel',
    epdNumber: 'EPD-11111',
    gwpPerFunctionalUnit: 5.2,
    msfFactor: 2.0,
    totalKgCO2ePer1000SF: 10400,
  },
];

const basePayload: AssemblyReportPayload = {
  projectName: 'Test Tower',
  facadeScope: 'Exterior Facade Levels 3–12',
  assemblies: baseAssemblies,
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/submittals/assemblies/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/submittals/assemblies/report', () => {
  it('returns a PDF buffer with correct headers for a valid payload', async () => {
    const res = await POST(makeRequest(basePayload));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment; filename="greenchainz-defensibility-report-test-tower\.pdf"/);

    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(1000);
    // PDF magic bytes
    const header = Buffer.from(buf).toString('utf8', 0, 4);
    expect(header).toBe('%PDF');
  });

  it('includes optional architect fields without error', async () => {
    const payload: AssemblyReportPayload = {
      ...basePayload,
      architectName: 'Jane Smith, AIA',
      architectFirm: 'Smith & Partners',
      reportDate: 'January 1, 2026',
    };
    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });

  it('returns 400 when projectName is missing', async () => {
    const { projectName: _p, ...rest } = basePayload;
    const res = await POST(makeRequest(rest));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/projectName/);
  });

  it('returns 400 when facadeScope is missing', async () => {
    const { facadeScope: _f, ...rest } = basePayload;
    const res = await POST(makeRequest(rest));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/facadeScope/);
  });

  it('returns 400 when assemblies array is empty', async () => {
    const res = await POST(makeRequest({ ...basePayload, assemblies: [] }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/assemblies/);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/submittals/assemblies/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Invalid JSON/);
  });

  it('handles a large number of assemblies without throwing', async () => {
    const manyAssemblies = Array.from({ length: 50 }, (_, i) => ({
      assemblyId: `EWS-${String(i + 1).padStart(2, '0')}`,
      epdNumber: `EPD-${10000 + i}`,
      gwpPerFunctionalUnit: 5 + i * 0.3,
      msfFactor: 1.0 + i * 0.01,
      totalKgCO2ePer1000SF: Math.round((5 + i * 0.3) * (1.0 + i * 0.01) * 1000),
    }));

    const res = await POST(makeRequest({ ...basePayload, assemblies: manyAssemblies }));
    expect(res.status).toBe(200);
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(1000);
  });
});
