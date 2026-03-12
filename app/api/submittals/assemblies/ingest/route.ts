import { NextRequest, NextResponse } from 'next/server';
import { getDocumentTablesFromAzure } from '@/lib/azure/document-intelligence';
import { mapDocumentIntelligenceTableToAssemblies } from '@/lib/agents/decision-logic-extractor';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Invalid file format: expected a PDF upload' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const tables = await getDocumentTablesFromAzure(buffer);

    const allRows = tables.flatMap((t) =>
      mapDocumentIntelligenceTableToAssemblies(t)
    );

    return NextResponse.json({ rows: allRows });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to process document';
    console.error('Assembly ingestion failed', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
