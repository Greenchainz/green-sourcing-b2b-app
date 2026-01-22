import { NextRequest, NextResponse } from 'next/server';
import { extractEPDData, extractCertificationData } from '@/lib/azure/document-intelligence';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { validateDocumentUrl } from '@/lib/utils/url-validation';

export async function POST(req: NextRequest) {
  // Authentication check
  const user = authenticateRequest(req);
  if (!user) {
    return unauthorizedResponse('Authentication required to extract documents');
  }

  try {
    const { document_url, document_type } = await req.json();

    if (!document_url || !document_type) {
      return NextResponse.json(
        { error: 'document_url and document_type required' },
        { status: 400 }
      );
    }

    // Validate URL to prevent SSRF attacks
    const urlValidation = validateDocumentUrl(document_url);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: `Invalid document URL: ${urlValidation.error}` },
        { status: 400 }
      );
    }

    let extracted;

    if (document_type === 'epd') {
      extracted = await extractEPDData(document_url);
    } else if (document_type === 'certification') {
      extracted = await extractCertificationData(document_url);
    } else {
      return NextResponse.json(
        { error: 'Invalid document_type. Use "epd" or "certification"' },
        { status: 400 }
      );
    }

    // Log for audit trail
    console.log(`[AUDIT] Document extracted: ${document_type}`, {
      user_id: user.userId,
      user_email: user.email,
      document_url,
      document_type,
      timestamp: new Date().toISOString(),
      confidence_scores: extracted.confidence_scores,
      fields_extracted: Object.keys(extracted).filter(k => k !== 'confidence_scores'),
    });

    // Flag low confidence extractions
    const lowConfidenceFields = Object.entries(extracted.confidence_scores)
      .filter(([_, score]) => score < 0.7)
      .map(([field]) => field);

    if (lowConfidenceFields.length > 0) {
      console.warn(`[WARNING] Low confidence fields detected: ${lowConfidenceFields.join(', ')}`);
    }

    return NextResponse.json({
      success: true,
      extracted_data: extracted,
      warnings: lowConfidenceFields.length > 0
        ? { low_confidence_fields: lowConfidenceFields }
        : undefined,
    });
  } catch (error) {
    console.error('[ERROR] Document Intelligence extraction failed', error);

    return NextResponse.json(
      {
        error: 'Document extraction failed',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
