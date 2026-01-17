/**
 * Azure OpenAI SDK Configuration
 * 
 * GPT-4o integration for GreenChainz B2B platform with:
 * - Automatic retries with exponential backoff
 * - Streaming support
 * - Token counting and usage tracking
 * - Structured output support (JSON mode)
 * 
 * Azure OpenAI is used for:
 * - Product sustainability audits
 * - EPD document analysis
 * - RFQ response generation
 * - Chat/Assistant features
 */

import { AzureOpenAI } from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletion,
} from "openai/resources/chat/completions";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface OpenAIConfig {
  /** Azure OpenAI endpoint URL */
  endpoint: string;
  /** API key for authentication */
  apiKey: string;
  /** Deployment name (e.g., 'gpt-4o', 'gpt-4-turbo') */
  deployment: string;
  /** API version (default: 2024-08-01-preview) */
  apiVersion?: string;
}

export interface ChatOptions {
  /** Temperature for response randomness (0-2, default: 0.7) */
  temperature?: number;
  /** Maximum tokens in response (default: 4096) */
  maxTokens?: number;
  /** System message to set context */
  systemMessage?: string;
  /** Enable JSON response mode */
  jsonMode?: boolean;
  /** Stop sequences */
  stop?: string[];
  /** User identifier for tracking */
  user?: string;
}

export interface ChatResponse {
  /** Generated message content */
  content: string;
  /** Usage statistics */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Finish reason */
  finishReason: string;
  /** Model used */
  model: string;
}

export interface StreamChunk {
  /** Content delta */
  content: string;
  /** Whether this is the final chunk */
  done: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Default API version for Azure OpenAI */
const DEFAULT_API_VERSION = "2024-08-01-preview";

/** Default model deployment for GPT-4o */
const DEFAULT_DEPLOYMENT = "gpt-4o";

/** Retry configuration */
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ============================================================================
// SINGLETON CLIENT
// ============================================================================

let openaiClient: AzureOpenAI | null = null;
let currentConfig: OpenAIConfig | null = null;

/**
 * Get configuration from environment variables
 */
function getConfigFromEnv(): OpenAIConfig {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || DEFAULT_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || DEFAULT_API_VERSION;

  if (!endpoint) {
    throw new Error(
      "Missing AZURE_OPENAI_ENDPOINT environment variable. " +
      "Please configure Azure OpenAI credentials."
    );
  }

  if (!apiKey) {
    throw new Error(
      "Missing AZURE_OPENAI_API_KEY environment variable. " +
      "Please configure Azure OpenAI credentials."
    );
  }

  return { endpoint, apiKey, deployment, apiVersion };
}

/**
 * Check if configuration has changed
 */
function configChanged(newConfig: OpenAIConfig): boolean {
  if (!currentConfig) return true;
  return (
    currentConfig.endpoint !== newConfig.endpoint ||
    currentConfig.apiKey !== newConfig.apiKey ||
    currentConfig.deployment !== newConfig.deployment ||
    currentConfig.apiVersion !== newConfig.apiVersion
  );
}

/**
 * Get or create the singleton AzureOpenAI client
 * 
 * @returns Configured AzureOpenAI instance
 * @throws Error if Azure OpenAI credentials are not configured
 */
export function getOpenAIClient(): AzureOpenAI {
  const config = getConfigFromEnv();

  if (openaiClient && !configChanged(config)) {
    return openaiClient;
  }

  currentConfig = config;
  openaiClient = new AzureOpenAI({
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    apiVersion: config.apiVersion,
    deployment: config.deployment,
    maxRetries: MAX_RETRIES,
  });

  console.log(`✅ Azure OpenAI client initialized (deployment: ${config.deployment})`);
  return openaiClient;
}

/**
 * Check if Azure OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  try {
    getConfigFromEnv();
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// CHAT COMPLETION
// ============================================================================

/**
 * Sleep utility for retry logic
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a chat completion with retry logic
 * 
 * @param messages - Array of chat messages
 * @param options - Chat options
 * @returns Chat response with content and usage
 */
export async function chat(
  messages: ChatCompletionMessageParam[],
  options: ChatOptions = {}
): Promise<ChatResponse> {
  const client = getOpenAIClient();
  const config = currentConfig!;

  const systemMessages: ChatCompletionMessageParam[] = options.systemMessage
    ? [{ role: "system", content: options.systemMessage }]
    : [];

  const allMessages = [...systemMessages, ...messages];

  const params: ChatCompletionCreateParamsNonStreaming = {
    model: config.deployment,
    messages: allMessages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
    stop: options.stop,
    user: options.user,
    response_format: options.jsonMode ? { type: "json_object" } : undefined,
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response: ChatCompletion = await client.chat.completions.create(params);

      const choice = response.choices[0];
      if (!choice || !choice.message.content) {
        throw new Error("No content in response");
      }

      return {
        content: choice.message.content,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason || "unknown",
        model: response.model,
      };
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ OpenAI request failed (attempt ${attempt}/${MAX_RETRIES}):`, error);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw new Error(`OpenAI request failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
}

/**
 * Execute a simple chat with a single user message
 * 
 * @param prompt - User message
 * @param options - Chat options
 * @returns Generated content string
 */
export async function simpleChat(
  prompt: string,
  options: ChatOptions = {}
): Promise<string> {
  const response = await chat(
    [{ role: "user", content: prompt }],
    options
  );
  return response.content;
}

// ============================================================================
// STREAMING CHAT
// ============================================================================

/**
 * Execute a streaming chat completion
 * 
 * @param messages - Array of chat messages
 * @param options - Chat options
 * @returns Async generator yielding content chunks
 */
export async function* streamChat(
  messages: ChatCompletionMessageParam[],
  options: ChatOptions = {}
): AsyncGenerator<StreamChunk> {
  const client = getOpenAIClient();
  const config = currentConfig!;

  const systemMessages: ChatCompletionMessageParam[] = options.systemMessage
    ? [{ role: "system", content: options.systemMessage }]
    : [];

  const allMessages = [...systemMessages, ...messages];

  const params: ChatCompletionCreateParamsStreaming = {
    model: config.deployment,
    messages: allMessages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
    stop: options.stop,
    user: options.user,
    stream: true,
    response_format: options.jsonMode ? { type: "json_object" } : undefined,
  };

  try {
    const stream = await client.chat.completions.create(params);

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      const done = chunk.choices[0]?.finish_reason !== null;

      if (delta) {
        yield { content: delta, done: false };
      }

      if (done) {
        yield { content: "", done: true };
        break;
      }
    }
  } catch (error) {
    console.error("❌ Streaming chat failed:", error);
    throw new Error(`Streaming chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// SPECIALIZED FUNCTIONS FOR GREENCHAINZ
// ============================================================================

/**
 * Generate a sustainability audit for a product
 * 
 * @param productData - Product information for auditing
 * @returns Structured audit response
 */
export async function auditProductSustainability(
  productData: {
    name: string;
    manufacturer: string;
    gwp?: number;
    certifications?: string[];
    epdUrl?: string;
    additionalContext?: string;
  }
): Promise<{
  sustainabilityScore: number;
  analysis: string;
  recommendations: string[];
  certificationStatus: string;
}> {
  const prompt = `
Analyze the sustainability profile of the following construction material:

Product: ${productData.name}
Manufacturer: ${productData.manufacturer}
${productData.gwp ? `GWP (Global Warming Potential): ${productData.gwp} kg CO2e` : ''}
${productData.certifications?.length ? `Certifications: ${productData.certifications.join(', ')}` : ''}
${productData.epdUrl ? `EPD Available: Yes` : 'EPD Available: No'}
${productData.additionalContext ? `Additional Context: ${productData.additionalContext}` : ''}

Provide a JSON response with the following structure:
{
  "sustainabilityScore": <number 0-100>,
  "analysis": "<detailed analysis>",
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...],
  "certificationStatus": "<verified|partial|unverified>"
}
`;

  const response = await chat(
    [{ role: "user", content: prompt }],
    {
      systemMessage: "You are an expert sustainability auditor for construction materials. Provide accurate, data-driven assessments based on GWP values, certifications, and EPD availability.",
      jsonMode: true,
      temperature: 0.3,
    }
  );

  try {
    return JSON.parse(response.content);
  } catch {
    throw new Error("Failed to parse sustainability audit response");
  }
}

/**
 * Analyze an EPD document text and extract key metrics
 * 
 * @param epdText - Extracted text from EPD document
 * @returns Structured EPD analysis
 */
export async function analyzeEPDDocument(
  epdText: string
): Promise<{
  productName: string;
  manufacturer: string;
  gwp: number | null;
  functionalUnit: string;
  validUntil: string | null;
  certifications: string[];
  confidence: number;
}> {
  const prompt = `
Extract key information from the following EPD (Environmental Product Declaration) document text:

${epdText.substring(0, 8000)} // Truncate to fit context

Provide a JSON response with the following structure:
{
  "productName": "<product name>",
  "manufacturer": "<manufacturer name>",
  "gwp": <GWP value in kg CO2e per functional unit or null if not found>,
  "functionalUnit": "<functional unit description>",
  "validUntil": "<expiration date or null>",
  "certifications": ["<certification 1>", ...],
  "confidence": <0-100 confidence score for extraction accuracy>
}
`;

  const response = await chat(
    [{ role: "user", content: prompt }],
    {
      systemMessage: "You are an expert at extracting structured data from Environmental Product Declaration (EPD) documents. Be precise and indicate confidence levels.",
      jsonMode: true,
      temperature: 0.2,
    }
  );

  try {
    return JSON.parse(response.content);
  } catch {
    throw new Error("Failed to parse EPD analysis response");
  }
}

/**
 * Generate a professional RFQ response
 * 
 * @param rfqDetails - RFQ request details
 * @returns Generated RFQ response text
 */
export async function generateRFQResponse(
  rfqDetails: {
    projectName: string;
    requirements: string;
    productMatch: string;
    supplierName: string;
    sustainabilityHighlights?: string[];
  }
): Promise<string> {
  const prompt = `
Generate a professional RFQ response for the following request:

Project: ${rfqDetails.projectName}
Requirements: ${rfqDetails.requirements}
Matched Product: ${rfqDetails.productMatch}
Supplier: ${rfqDetails.supplierName}
${rfqDetails.sustainabilityHighlights?.length 
  ? `Sustainability Highlights: ${rfqDetails.sustainabilityHighlights.join(', ')}` 
  : ''}

Generate a professional, compelling response that highlights the product's sustainability credentials and fit for the project requirements.
`;

  const response = await chat(
    [{ role: "user", content: prompt }],
    {
      systemMessage: "You are a professional B2B sales writer specializing in sustainable construction materials. Write compelling, fact-based responses that highlight environmental benefits.",
      temperature: 0.6,
    }
  );

  return response.content;
}

// ============================================================================
// EMBEDDINGS (for semantic search)
// ============================================================================

/**
 * Generate embeddings for text using Azure OpenAI
 * Note: Requires an embeddings deployment (e.g., text-embedding-ada-002)
 * 
 * @param text - Text to embed
 * @param deploymentName - Embeddings model deployment name
 * @returns Embedding vector
 */
export async function generateEmbedding(
  text: string,
  deploymentName: string = "text-embedding-ada-002"
): Promise<number[]> {
  const client = getOpenAIClient();

  try {
    const response = await client.embeddings.create({
      model: deploymentName,
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("❌ Embedding generation failed:", error);
    throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Reset the OpenAI client (useful for testing)
 */
export function resetOpenAIClient(): void {
  openaiClient = null;
  currentConfig = null;
  console.log("✅ Azure OpenAI client reset");
}
