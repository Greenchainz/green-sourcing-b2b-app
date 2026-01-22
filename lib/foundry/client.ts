import axios, { AxiosError } from 'axios';

const FOUNDRY_API_ENDPOINT = process.env.AZURE_FOUNDRY_API_URL;
const FOUNDRY_API_KEY = process.env.AZURE_FOUNDRY_API_KEY;
const FOUNDRY_TIMEOUT_MS = parseInt(process.env.AZURE_FOUNDRY_TIMEOUT_MS || '30000', 10);
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000; // Initial delay, increases exponentially

export interface WorkflowResult {
  execution_id: string;
  status: 'running' | 'completed' | 'failed';
  output: Record<string, any>;
}

function validateWorkflowName(workflowName: string): string {
  // Allow only alphanumeric characters, spaces, underscores, and hyphens, with a reasonable length limit.
  const WORKFLOW_NAME_REGEX = /^[A-Za-z0-9_\- ]{1,128}$/;
  if (!WORKFLOW_NAME_REGEX.test(workflowName)) {
    throw new Error('Invalid workflow name');
  }
  return workflowName;
}

/**
 * Check if error is retryable (network error, timeout, or 5xx server error)
 */
function isRetryableError(error: AxiosError): boolean {
  if (!error.response) {
    // Network errors (no response received)
    return true;
  }
  
  const status = error.response.status;
  // Retry on 5xx server errors and 429 (rate limit)
  return status >= 500 || status === 429;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry logic with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if it's not a retryable error
      if (axios.isAxiosError(error) && !isRetryableError(error)) {
        throw error;
      }
      
      // Don't sleep after the last attempt
      if (attempt < maxAttempts) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[RETRY] Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('Retry failed');
}

export async function invokeFoundryWorkflow(
  workflowName: string,
  payload: Record<string, any>
): Promise<WorkflowResult> {
  if (!FOUNDRY_API_ENDPOINT || !FOUNDRY_API_KEY) {
    throw new Error('Azure Foundry credentials not configured. Set AZURE_FOUNDRY_API_URL and AZURE_FOUNDRY_API_KEY');
  }

  const safeWorkflowName = validateWorkflowName(workflowName);

  return retryWithBackoff(async () => {
    try {
      const response = await axios.post(
        `${FOUNDRY_API_ENDPOINT}/workflows/${encodeURIComponent(safeWorkflowName)}/run`,
        {
          inputs: payload,
        },
        {
          headers: {
            'Authorization': `Bearer ${FOUNDRY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: FOUNDRY_TIMEOUT_MS,
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
  });
}

function validateExecutionId(executionId: string): string {
  // Restrict execution IDs to a safe character set and reasonable length.
  // Adjust the pattern if the Foundry API uses a different format.
  const EXECUTION_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;
  if (!EXECUTION_ID_REGEX.test(executionId)) {
    throw new Error('Invalid execution ID format');
  }
  return executionId;
}

export async function getWorkflowStatus(executionId: string): Promise<WorkflowResult> {
  if (!FOUNDRY_API_ENDPOINT || !FOUNDRY_API_KEY) {
    throw new Error('Azure Foundry credentials not configured');
  }

  const safeExecutionId = validateExecutionId(executionId);

  return retryWithBackoff(async () => {
    try {
      const response = await axios.get(
        `${FOUNDRY_API_ENDPOINT}/executions/${encodeURIComponent(safeExecutionId)}`,
        {
          headers: {
            'Authorization': `Bearer ${FOUNDRY_API_KEY}`,
          },
          timeout: FOUNDRY_TIMEOUT_MS,
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
  });
}
