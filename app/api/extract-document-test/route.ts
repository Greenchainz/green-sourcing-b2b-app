import { NextRequest, NextResponse } from 'next/server';
import { extractEPDData, extractCertificationData } from '@/lib/azure/document-intelligence';

/**
 * GET endpoint for testing Azure Container Apps log streaming
 * This endpoint ensures server-side logs are emitted to stdout
 */
export async function GET() {
  console.log('[extract-document-test] HIT in production at', new Date().toISOString());
  return NextResponse.json({ success: true, source: 'production' });
}

export async function POST(req: NextRequest) {
  console.log('[extract-document-test] POST request received at', new Date().toISOString());
  try {
    const { document_url, document_type } = await req.json();
    console.log('[extract-document-test] Processing:', { document_type, document_url });

    if (!document_url || !document_type) {
      return NextResponse.json(
        { error: 'document_url and document_type required' },
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

    return NextResponse.json({
      success: true,
      extracted_data: extracted,
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
