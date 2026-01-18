import { POST } from '@/app/api/agents/decision-extractor/route';
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
                    criteria: [{ name: 'Price', description: 'Low cost', importance: 'High', conditions: '< $100' }],
                    rules: ['Must be red'],
                    decision_process: 'Chose cheapest red item'
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

describe('POST /api/agents/decision-extractor', () => {
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

  it('should extract logic successfully', async () => {
    const request = new Request('http://localhost/api/agents/decision-extractor', {
      method: 'POST',
      body: JSON.stringify({
        text: 'We chose the cheapest red item.',
        documentType: 'Memo',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.extraction.criteria[0].name).toBe('Price');
  });

  it('should return 400 if text is missing', async () => {
    const request = new Request('http://localhost/api/agents/decision-extractor', {
      method: 'POST',
      body: JSON.stringify({
        documentType: 'Memo',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required field: text');
  });
});
