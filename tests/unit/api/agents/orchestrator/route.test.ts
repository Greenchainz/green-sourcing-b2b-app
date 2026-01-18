import { POST } from '@/app/api/agents/orchestrator/route';
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
                    intent: 'email',
                    reasoning: 'User wants to send an email',
                    recommended_action: 'Use Email Writer',
                    subtasks: []
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

describe('POST /api/agents/orchestrator', () => {
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

  it('should plan a task successfully', async () => {
    const request = new Request('http://localhost/api/agents/orchestrator', {
      method: 'POST',
      body: JSON.stringify({
        task: 'Send an email to an architect',
        context: {},
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.plan.intent).toBe('email');
  });

  it('should return 400 if task is missing', async () => {
    const request = new Request('http://localhost/api/agents/orchestrator', {
      method: 'POST',
      body: JSON.stringify({
        context: {},
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required field: task');
  });
});
