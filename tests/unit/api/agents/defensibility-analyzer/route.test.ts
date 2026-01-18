import { POST } from '@/app/api/agents/defensibility-analyzer/route';
import { NextResponse } from 'next/server';

// Mock openai
jest.mock('openai', () => {
  return {
    AzureOpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    defensibility_score: 8,
                    analysis_summary: 'Good decision',
                    strengths: ['Data backed'],
                    weaknesses: ['None'],
                    missing_information: [],
                    recommendations: []
                  }),
                },
              },
            ],
          }),
        },
      },
    })),
  };
});

describe('POST /api/agents/defensibility-analyzer', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.AZURE_OPENAI_ENDPOINT = 'https://mock.openai.azure.com/';
    process.env.AZURE_OPENAI_API_KEY = 'mock-key';
    process.env.AZURE_OPENAI_DEPLOYMENT = 'mock-deployment';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should analyze defensibility successfully', async () => {
    const request = new Request('http://localhost/api/agents/defensibility-analyzer', {
      method: 'POST',
      body: JSON.stringify({
        decision: { id: 1 },
        alternatives: [],
        rationale: 'Best value',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.analysis.defensibility_score).toBe(8);
  });

  it('should return 400 if decision is missing', async () => {
    const request = new Request('http://localhost/api/agents/defensibility-analyzer', {
      method: 'POST',
      body: JSON.stringify({
        rationale: 'Best value',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required field: decision');
  });
});
