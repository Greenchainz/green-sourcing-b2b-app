import { DocumentAnalysisClient } from '@azure/ai-form-recognizer';
import { DefaultAzureCredential } from '@azure/identity';

const ENDPOINT = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT;
const credential = new DefaultAzureCredential();

if (!ENDPOINT) {
  console.warn(
    '[Document Intelligence] DOCUMENT_INTELLIGENCE_ENDPOINT environment variable not set. ' +
    'Document extraction features will be unavailable. ' +
    'Uses DefaultAzureCredential (managed identity) - no API key needed.'
  );
}

const client = ENDPOINT
  ? new DocumentAnalysisClient(ENDPOINT, credential)
  : null;

export interface ExtractedEPDData {
  gwp?: number;
  recycled_content_percentage?: number;
  certification_ids?: string[];
  expiration_date?: string;
  manufacturer_name?: string;
  confidence_scores: Record<string, number>;
}

export interface ExtractedCertData {
  certificate_id?: string;
  issue_date?: string;
  expiration_date?: string;
  issuing_authority?: string;
  confidence_scores: Record<string, number>;
}

export async function extractEPDData(
  documentUrl: string
): Promise<ExtractedEPDData> {
  if (!client) {
    throw new Error(
      'Document Intelligence client not initialized. ' +
      'Ensure DOCUMENT_INTELLIGENCE_ENDPOINT is set and the app has managed identity permissions. ' +
      'No API key required - uses DefaultAzureCredential.'
    );
  }

  const poller = await client.beginAnalyzeDocumentFromUrl(
    'prebuilt-document',
    documentUrl
  );

  const result = await poller.pollUntilDone();

  // Parse extracted fields
  const extracted: ExtractedEPDData = {
    confidence_scores: {},
  };

  // Accumulate multiple occurrences of the same field
  const certificationIds: string[] = [];

  for (const doc of result.documents || []) {
    for (const [fieldName, field] of Object.entries(doc.fields || {})) {
      const fieldLower = fieldName.toLowerCase();
      const content = field.content?.trim();

      // Map field names to our schema
      if (fieldLower.includes('gwp') || fieldLower.includes('global warming')) {
        const value = content ? parseFloat(content) : null;
        if (value !== null && !isNaN(value)) {
          // Take the highest confidence value if multiple occurrences
          if (!extracted.gwp || (field.confidence || 0) > (extracted.confidence_scores.gwp || 0)) {
            extracted.gwp = value;
            extracted.confidence_scores.gwp = field.confidence || 0;
          }
        }
      }

      if (fieldLower.includes('recycled') || fieldLower.includes('post-consumer')) {
        const value = content ? parseFloat(content) : null;
        if (value !== null && !isNaN(value)) {
          if (!extracted.recycled_content_percentage || (field.confidence || 0) > (extracted.confidence_scores.recycled_content || 0)) {
            extracted.recycled_content_percentage = value;
            extracted.confidence_scores.recycled_content = field.confidence || 0;
          }
        }
      }

      if (fieldLower.includes('certification') || fieldLower.includes('cert')) {
        // Accumulate all certification IDs found
        if (content) {
          const ids = content.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);
          certificationIds.push(...ids);
          extracted.confidence_scores.certifications = Math.max(
            extracted.confidence_scores.certifications || 0,
            field.confidence || 0
          );
        }
      }

      if (fieldLower.includes('expiration') || fieldLower.includes('valid until')) {
        if (content && (!extracted.expiration_date || (field.confidence || 0) > (extracted.confidence_scores.expiration_date || 0))) {
          extracted.expiration_date = content;
          extracted.confidence_scores.expiration_date = field.confidence || 0;
        }
      }

      if (fieldLower.includes('manufacturer') || fieldLower.includes('company')) {
        if (content && (!extracted.manufacturer_name || (field.confidence || 0) > (extracted.confidence_scores.manufacturer || 0))) {
          extracted.manufacturer_name = content;
          extracted.confidence_scores.manufacturer = field.confidence || 0;
        }
      }
    }
  }

  // Set certification IDs if any were found (remove duplicates)
  if (certificationIds.length > 0) {
    extracted.certification_ids = [...new Set(certificationIds)];
  }

  return extracted;
}

export async function extractCertificationData(
  documentUrl: string
): Promise<ExtractedCertData> {
  if (!client) {
    throw new Error(
      'Document Intelligence client not initialized. ' +
      'Ensure DOCUMENT_INTELLIGENCE_ENDPOINT is set and the app has managed identity permissions.'
    );
  }

  // Use prebuilt-document for certifications (FSC, LEED, etc.)
  // The prebuilt-idDocument model is for passports/driver's licenses only
  const poller = await client.beginAnalyzeDocumentFromUrl(
    'prebuilt-document',
    documentUrl
  );

  const result = await poller.pollUntilDone();

  const extracted: ExtractedCertData = {
    confidence_scores: {},
  };

  // Parse extracted fields for certification-specific data
  for (const doc of result.documents || []) {
    for (const [fieldName, field] of Object.entries(doc.fields || {})) {
      const fieldLower = fieldName.toLowerCase();

      // Map common certification field names
      if (fieldLower.includes('certificate') || fieldLower.includes('cert') || fieldLower.includes('number')) {
        extracted.certificate_id = field.content || extracted.certificate_id;
        extracted.confidence_scores.certificate_id = Math.max(
          extracted.confidence_scores.certificate_id || 0,
          field.confidence || 0
        );
      }

      if (fieldLower.includes('issue') || fieldLower.includes('issued')) {
        extracted.issue_date = field.content || extracted.issue_date;
        extracted.confidence_scores.issue_date = Math.max(
          extracted.confidence_scores.issue_date || 0,
          field.confidence || 0
        );
      }

      if (fieldLower.includes('expir') || fieldLower.includes('valid')) {
        extracted.expiration_date = field.content || extracted.expiration_date;
        extracted.confidence_scores.expiration_date = Math.max(
          extracted.confidence_scores.expiration_date || 0,
          field.confidence || 0
        );
      }

      if (fieldLower.includes('authority') || fieldLower.includes('issuer') || fieldLower.includes('organization')) {
        extracted.issuing_authority = field.content || extracted.issuing_authority;
        extracted.confidence_scores.issuing_authority = Math.max(
          extracted.confidence_scores.issuing_authority || 0,
          field.confidence || 0
        );
      }
    }
  }

  return extracted;
}
