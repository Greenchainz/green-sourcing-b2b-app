// lib/docIntel.ts
import { DocumentAnalysisClient } from "@azure/ai-form-recognizer";
import { getAzureCredential } from "./azure/credentials";

const endpoint = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT;
const credential = getAzureCredential();

export function getDocIntelClient() {
  if (!endpoint) {
    throw new Error("DOCUMENT_INTELLIGENCE_ENDPOINT not configured");
  }
  return new DocumentAnalysisClient(endpoint, credential);
}
