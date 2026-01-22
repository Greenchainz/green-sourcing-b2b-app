import { NextRequest, NextResponse } from 'next/server';
import { invokeFoundryWorkflow } from '@/lib/foundry/client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { validateWorkflowName } from '@/lib/utils/url-validation';

export async function POST(req: NextRequest) {
  // Authentication check
  const user = authenticateRequest(req);
  if (!user) {
    return unauthorizedResponse('Authentication required to trigger workflows');
  }

  try {
    const { workflow_name, payload } = await req.json();

    // Validate request
    if (!workflow_name || !payload) {
      return NextResponse.json(
        { error: 'workflow_name and payload required' },
        { status: 400 }
      );
    }

    // Validate workflow name to prevent injection
    const nameValidation = validateWorkflowName(workflow_name);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      );
    }

    // Validate payload is an object
    if (typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json(
        { error: 'payload must be an object' },
        { status: 400 }
      );
    }

    // Invoke Foundry workflow
    const result = await invokeFoundryWorkflow(workflow_name, payload);

    // Build a flexible payload summary for audit logging
    const payloadSummary =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? {
            top_level_keys: Object.keys(payload),
            // Include common identifiers only when present to avoid logging undefined
            ...(Object.prototype.hasOwnProperty.call(payload, 'product_id') && {
              product_id: (payload as Record<string, unknown>).product_id,
            }),
            ...(Object.prototype.hasOwnProperty.call(payload, 'supplier_id') && {
              supplier_id: (payload as Record<string, unknown>).supplier_id,
            }),
            ...(Object.prototype.hasOwnProperty.call(payload, 'rfq_id') && {
              rfq_id: (payload as Record<string, unknown>).rfq_id,
            }),
          }
        : {
            type: Array.isArray(payload) ? 'array' : typeof payload,
          };

    // Log for audit trail
    console.log(`[AUDIT] Workflow triggered: ${workflow_name}`, {
      user_id: user.userId,
      user_email: user.email,
      workflow_name,
      execution_id: result.execution_id,
      timestamp: new Date().toISOString(),
      payload_summary: payloadSummary,
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
  // Authentication check
  const user = authenticateRequest(req);
  if (!user) {
    return unauthorizedResponse('Authentication required to check workflow status');
  }

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
