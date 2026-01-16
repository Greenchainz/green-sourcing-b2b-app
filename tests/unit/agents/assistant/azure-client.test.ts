
import { AzureClient } from '../../../../lib/agents/assistant/azure-client';
import { getForgeToken } from '../../../../lib/autodesk-interceptor';
import axios from 'axios';
import { AzureOpenAI } from 'openai';

// Mock dependencies
jest.mock('axios');
jest.mock('openai');
jest.mock('../../../../lib/autodesk-interceptor', () => ({
    getForgeToken: jest.fn().mockResolvedValue('mock-token')
}));

describe('AzureClient', () => {
    let azureClient: AzureClient;
    let mockChatCreate: jest.Mock;

    beforeEach(() => {
        // Clear mocks
        jest.clearAllMocks();

        process.env.AZURE_OPENAI_ENDPOINT = 'https://mock.openai.azure.com';
        process.env.AZURE_OPENAI_API_KEY = 'mock-key';
        process.env.AZURE_OPENAI_DEPLOYMENT = 'mock-deployment';

        // Mock OpenAI client
        mockChatCreate = jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Mock Audit Report' } }]
        });

        // Mock the constructor of AzureOpenAI
        (AzureOpenAI as unknown as jest.Mock).mockImplementation(() => ({
            chat: {
                completions: {
                    create: mockChatCreate
                }
            }
        }));

        azureClient = new AzureClient();
    });

    it('should initialize correctly', () => {
        expect(AzureOpenAI).toHaveBeenCalledTimes(1);
    });

    it('should audit a product using SDA and LLM', async () => {
        // Mock SDA response
        (axios.get as jest.Mock).mockResolvedValue({
            data: {
                data: [{
                    id: '123',
                    attributes: {
                        name: 'Test Material',
                        description: 'A sustainable material',
                        gwp: { value: 5.5, unit: 'kgCO2e' },
                        manufacturer: 'Test Corp'
                    }
                }]
            }
        });

        const report = await azureClient.auditProduct('Test Material');

        // Verify Auth Token was fetched
        expect(getForgeToken).toHaveBeenCalled();

        // Verify SDA API call
        expect(axios.get).toHaveBeenCalledWith(
            expect.stringContaining('/sustainability/v3/materials'),
            expect.objectContaining({
                headers: { Authorization: 'Bearer mock-token' },
                params: expect.objectContaining({ 'filter[name]': 'Test Material' })
            })
        );

        // Verify LLM call
        expect(mockChatCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({ role: 'system' }),
                    expect.objectContaining({ role: 'user', content: expect.stringContaining('Autodesk SDA Data Found') })
                ])
            })
        );

        expect(report).toBe('Mock Audit Report');
    });

    it('should handle SDA failure gracefully', async () => {
        // Mock SDA failure
        (axios.get as jest.Mock).mockRejectedValue(new Error('API Error'));

        const report = await azureClient.auditProduct('Missing Material');

        // Verify LLM call still happens with error context
        expect(mockChatCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: expect.stringContaining('Error retrieving data')
                    })
                ])
            })
        );

        expect(report).toBe('Mock Audit Report');
    });
});
