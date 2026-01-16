import { POST } from '@/app/api/agents/email-writer/route';
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
                  content: 'Subject: Green Construction Solutions\n\nDear Architect,\n\nWe have great sustainable options for you.',
                },
              },
            ],
          }),
        },
      },
    })),
  };
});

describe('POST /api/agents/email-writer', () => {
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

  it('should generate an email successfully', async () => {
    const request = new Request('http://localhost/api/agents/email-writer', {
      method: 'POST',
      body: JSON.stringify({
        recipientType: 'Architect',
        purpose: 'Introduction',
        context: 'Met at a conference',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.email).toContain('Dear Architect');
  });

  it('should return 400 if required fields are missing', async () => {
    const request = new Request('http://localhost/api/agents/email-writer', {
      method: 'POST',
      body: JSON.stringify({
        recipientType: 'Architect',
        // purpose and context missing
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields: recipientType, purpose, context');
  });

  it('should return 500 if credentials are missing', async () => {
    delete process.env.AZURE_OPENAI_ENDPOINT;

    const request = new Request('http://localhost/api/agents/email-writer', {
      method: 'POST',
      body: JSON.stringify({
        recipientType: 'Architect',
        purpose: 'Intro',
        context: 'Test',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Server configuration error: Azure OpenAI credentials missing');
  });
});
