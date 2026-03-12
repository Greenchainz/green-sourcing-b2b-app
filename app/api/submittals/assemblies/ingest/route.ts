import { NextRequest, NextResponse } from 'next/server';
import { getDocumentTablesFromAzure } from '@/lib/azure/document-intelligence';
import {
  mapDocumentIntelligenceTableToAssemblies,
  type ExtractedAssemblyRow,
} from '@/lib/agents/decision-logic-extractor';
import { lookupEpd, type Ec3EpdResult } from '@/lib/greenchainz/ec3-client';

export const runtime = 'nodejs';

export type AssemblyRowWithEc3 = ExtractedAssemblyRow & {
  ec3?: Ec3EpdResult & { gwpDiffPercent?: number };
};

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

    const baseRows = tables.flatMap((t) =>
      mapDocumentIntelligenceTableToAssemblies(t)
    );

    // Enrich each row with EC3 data; individual lookup failures are non-fatal.
    const rows: AssemblyRowWithEc3[] = [];

    for (const row of baseRows) {
      let ec3Result: Ec3EpdResult | null = null;
      try {
        ec3Result = await lookupEpd(row.epdNumber);
      } catch (e) {
        console.warn('EC3 lookup warning for EPD', row.epdNumber, e instanceof Error ? e.message : e);
      }

      let gwpDiffPercent: number | undefined;
      if (ec3Result && row.gwpPerFunctionalUnit !== 0 && row.gwpPerFunctionalUnit !== undefined) {
        const diff =
          ((ec3Result.gwpPerUnit - row.gwpPerFunctionalUnit) / row.gwpPerFunctionalUnit) * 100;
        gwpDiffPercent = Number(diff.toFixed(1));
      }

      rows.push({
        ...row,
        ...(ec3Result
          ? { ec3: { ...ec3Result, ...(gwpDiffPercent !== undefined ? { gwpDiffPercent } : {}) } }
          : {}),
      });
    }

    return NextResponse.json({ rows });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to process document';
    console.error('Assembly ingestion failed', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
