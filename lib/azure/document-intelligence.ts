import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';

const ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT!;
const API_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY!;

if (!ENDPOINT || !API_KEY) {
  console.warn('Azure Document Intelligence credentials not configured');
}

const client = ENDPOINT && API_KEY
  ? new DocumentAnalysisClient(ENDPOINT, new AzureKeyCredential(API_KEY))
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
    throw new Error('Document Intelligence client not initialized. Check environment variables.');
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

  for (const doc of result.documents || []) {
    for (const [fieldName, field] of Object.entries(doc.fields || {})) {
      const fieldLower = fieldName.toLowerCase();

      // Map field names to our schema
      if (fieldLower.includes('gwp') || fieldLower.includes('global warming')) {
        extracted.gwp = parseFloat(field.content || '0');
        extracted.confidence_scores.gwp = field.confidence || 0;
      }

      if (fieldLower.includes('recycled') || fieldLower.includes('post-consumer')) {
        extracted.recycled_content_percentage = parseFloat(field.content || '0');
        extracted.confidence_scores.recycled_content = field.confidence || 0;
      }

      if (fieldLower.includes('certification') || fieldLower.includes('cert')) {
        extracted.certification_ids = field.content?.split(',').map(s => s.trim()) || [];
        extracted.confidence_scores.certifications = field.confidence || 0;
      }

      if (fieldLower.includes('expiration') || fieldLower.includes('valid until')) {
        extracted.expiration_date = field.content || '';
        extracted.confidence_scores.expiration_date = field.confidence || 0;
      }

      if (fieldLower.includes('manufacturer') || fieldLower.includes('company')) {
        extracted.manufacturer_name = field.content || '';
        extracted.confidence_scores.manufacturer = field.confidence || 0;
      }
    }
  }

  return extracted;
}

export async function extractCertificationData(
  documentUrl: string
): Promise<ExtractedCertData> {
  if (!client) {
    throw new Error('Document Intelligence client not initialized');
  }

  const poller = await client.beginAnalyzeDocumentFromUrl(
    'prebuilt-idDocument',
    documentUrl
  );

  const result = await poller.pollUntilDone();

  const fields = result.documents?.[0]?.fields || {};

  return {
    certificate_id: fields['DocumentNumber']?.content,
    issue_date: fields['DateOfIssue']?.content,
    expiration_date: fields['DateOfExpiration']?.content,
    issuing_authority: fields['IssuingCountry']?.content,
    confidence_scores: {
      certificate_id: fields['DocumentNumber']?.confidence || 0,
      issue_date: fields['DateOfIssue']?.confidence || 0,
      expiration_date: fields['DateOfExpiration']?.confidence || 0,
      issuing_authority: fields['IssuingCountry']?.confidence || 0,
    },
  };
}
