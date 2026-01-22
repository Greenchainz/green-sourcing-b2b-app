import axios from 'axios';

const FOUNDRY_API_ENDPOINT = process.env.AZURE_FOUNDRY_API_URL;
const FOUNDRY_API_KEY = process.env.AZURE_FOUNDRY_API_KEY;

export interface WorkflowResult {
  execution_id: string;
  status: 'running' | 'completed' | 'failed';
  output: Record<string, any>;
}

export async function invokeFoundryWorkflow(
  workflowName: string,
  payload: Record<string, any>
): Promise<WorkflowResult> {
  if (!FOUNDRY_API_ENDPOINT || !FOUNDRY_API_KEY) {
    throw new Error('Azure Foundry credentials not configured. Set AZURE_FOUNDRY_API_URL and AZURE_FOUNDRY_API_KEY');
  }

  try {
    const response = await axios.post(
      `${FOUNDRY_API_ENDPOINT}/workflows/${workflowName}/run`,
      {
        inputs: payload,
      },
      {
        headers: {
          'Authorization': `Bearer ${FOUNDRY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    return {
      execution_id: response.data.run_id,
      status: response.data.status,
      output: response.data.outputs || {},
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Foundry workflow invocation failed: ${error.response?.data?.message || error.message}`
      );
    }
    throw new Error(
      `Foundry workflow invocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getWorkflowStatus(executionId: string): Promise<WorkflowResult> {
  if (!FOUNDRY_API_ENDPOINT || !FOUNDRY_API_KEY) {
    throw new Error('Azure Foundry credentials not configured');
  }

  try {
    const response = await axios.get(
      `${FOUNDRY_API_ENDPOINT}/executions/${executionId}`,
      {
        headers: {
          'Authorization': `Bearer ${FOUNDRY_API_KEY}`,
        },
      }
    );

    return {
      execution_id: response.data.run_id,
      status: response.data.status,
      output: response.data.outputs || {},
    };
  } catch (error) {
    throw new Error(
      `Failed to get workflow status: ${error instanceof Error ? error.message : 'Unknown'}`
    );
  }
}
