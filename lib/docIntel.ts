// lib/docIntel.ts
import { DefaultAzureCredential } from "@azure/identity";
import { DocumentAnalysisClient } from "@azure/ai-form-recognizer";

const endpoint = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT;
const credential = new DefaultAzureCredential();

export function getDocIntelClient() {
  if (!endpoint) {
    throw new Error("DOCUMENT_INTELLIGENCE_ENDPOINT not configured");
  }
  return new DocumentAnalysisClient(endpoint, credential);
}
