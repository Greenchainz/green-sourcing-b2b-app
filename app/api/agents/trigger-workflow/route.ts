import { NextRequest, NextResponse } from 'next/server';
import { invokeFoundryWorkflow } from '@/lib/foundry/client';

export async function POST(req: NextRequest) {
  try {
    const { workflow_name, payload } = await req.json();

    // Validate request
    if (!workflow_name || !payload) {
      return NextResponse.json(
        { error: 'workflow_name and payload required' },
        { status: 400 }
      );
    }

    // Invoke Foundry workflow
    const result = await invokeFoundryWorkflow(workflow_name, payload);

    // Log for audit trail
    console.log(`[AUDIT] Workflow triggered: ${workflow_name}`, {
      workflow_name,
      execution_id: result.execution_id,
      timestamp: new Date().toISOString(),
      payload_summary: {
        product_id: payload.product_id,
        supplier_id: payload.supplier_id,
        rfq_id: payload.rfq_id,
      },
    });

    return NextResponse.json({
      success: true,
      workflow_execution_id: result.execution_id,
      status: result.status,
      output: result.output,
    });
  } catch (error) {
    console.error('[ERROR] Workflow execution failed', error);

    return NextResponse.json(
      {
        error: 'Workflow execution failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const executionId = searchParams.get('execution_id');

  if (!executionId) {
    return NextResponse.json(
      { error: 'execution_id query parameter required' },
      { status: 400 }
    );
  }

  try {
    const { getWorkflowStatus } = await import('@/lib/foundry/client');
    const result = await getWorkflowStatus(executionId);

    return NextResponse.json({
      success: true,
      execution_id: result.execution_id,
      status: result.status,
      output: result.output,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get workflow status',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
