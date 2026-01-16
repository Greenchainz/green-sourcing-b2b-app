
import axios from 'axios';
import { getForgeToken } from '../../autodesk-interceptor';
import { AzureOpenAI } from 'openai';

// Define response types for SDA to use in auditing
interface SDAProductResponse {
    id: string;
    name: string;
    description: string;
    gwp?: {
        value: number;
        unit: string;
    };
    manufacturer?: string;
    certifications?: string[];
}

export class AzureClient {
    private client: AzureOpenAI | null = null;
    private deployment: string;

    constructor() {
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_API_KEY;
        this.deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4';

        if (endpoint && apiKey) {
            this.client = new AzureOpenAI({
                endpoint,
                apiKey,
                apiVersion: "2024-05-01-preview",
                deployment: this.deployment
            });
        } else {
            console.warn("Azure OpenAI credentials not found. Auditing will be limited.");
        }
    }

    /**
     * Audits a product using Autodesk Sustainability Data API (SDA) and Azure OpenAI.
     *
     * @param productId - The ID or name of the product to audit.
     * @returns A text audit report.
     */
    async auditProduct(productId: string): Promise<string> {
        if (!this.client) return "Mock Audit: Product looks sustainable (LLM not configured).";

        // Integrate with Autodesk SDA API
        let sdaData: SDAProductResponse | null = null;
        let auditContext = "";

        try {
            // Authenticate with Autodesk
            const token = await getForgeToken();

            // Endpoint structure inferred from "Sustainability Data API" v3 context
            const response = await axios.get(
                `https://developer.api.autodesk.com/sustainability/v3/materials`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        'filter[name]': productId, // Assuming filtering by name is possible
                        'page[limit]': 1
                    }
                }
            );

            if (response.data && response.data.data && response.data.data.length > 0) {
                const item = response.data.data[0];
                sdaData = {
                    id: item.id,
                    name: item.attributes.name,
                    description: item.attributes.description,
                    gwp: item.attributes.gwp, // Hypothetical structure
                    manufacturer: item.attributes.manufacturer
                };
                auditContext = `Autodesk SDA Data Found:\n${JSON.stringify(sdaData, null, 2)}`;
            } else {
                auditContext = `Autodesk SDA Data: No direct match found for "${productId}" in the sustainability database.`;
            }

        } catch (error) {
            console.error("Failed to fetch data from Autodesk SDA:", error);
            auditContext = "Autodesk SDA Data: Error retrieving data (API might be unavailable or configured incorrectly).";
        }

        // Use LLM to generate the audit report
        try {
            const completion = await this.client.chat.completions.create({
                model: this.deployment,
                messages: [
                    {
                        role: "system",
                        content: `You are an expert sustainability auditor for construction materials.
                        Your goal is to evaluate products based on available data, specifically looking for low carbon (low GWP) and healthy materials.
                        Use the provided Autodesk Sustainability Data API (SDA) data to inform your audit.`
                    },
                    {
                        role: "user",
                        content: `Please audit the following product: "${productId}".\n\n${auditContext}\n\nProvide a brief assessment of its sustainability profile.`
                    }
                ]
            });

            return completion.choices[0].message.content || "No audit generated.";
        } catch (error) {
            console.error("LLM Audit failed:", error);
            return "Audit failed due to LLM error.";
        }
    }
}
