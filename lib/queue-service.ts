import { QueueServiceClient } from "@azure/storage-queue";
import { getAzureCredential } from "./azure/credentials";

/**
 * Get Queue Service Client with Managed Identity or Connection String
 */
function getQueueServiceClient(): QueueServiceClient {
  const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!storageAccountName && !connectionString) {
    throw new Error(
      "Missing AZURE_STORAGE_ACCOUNT_NAME or AZURE_STORAGE_CONNECTION_STRING environment variable. " +
      "For managed identity (production), set AZURE_STORAGE_ACCOUNT_NAME. " +
      "For connection string (local dev), set AZURE_STORAGE_CONNECTION_STRING."
    );
  }

  // Use managed identity if account name is provided (production)
  if (storageAccountName) {
    const accountUrl = `https://${storageAccountName}.queue.core.windows.net`;
    const credential = getAzureCredential();
    return new QueueServiceClient(accountUrl, credential);
  }

  // Fallback to connection string (local development)
  if (connectionString) {
    return QueueServiceClient.fromConnectionString(connectionString);
  }

  throw new Error("Unable to initialize Queue Service Client");
}

export type TaskType = 
  | "scrape_supplier" 
  | "scrape_url" 
  | "sync_ec3" 
  | "sync_epd" 
  | "process_document"
  | "data_janitor";

// Updated to match User Request: { task_type, payload, priority }
export interface QueueTask {
  task_type: TaskType;
  payload: Record<string, unknown>;
  priority?: "normal" | "high" | "low";
  timestamp: string;
  requestedBy?: string;
  // Backward compatibility fields (optional)
  type?: TaskType;
}

export async function sendToScraperQueue(taskType: TaskType, payload: Record<string, unknown>, priority: "normal" | "high" | "low" = "normal") {
  try {
    const queueServiceClient = getQueueServiceClient();
    const queueName = "scraper-tasks";
    const queueClient = queueServiceClient.getQueueClient(queueName);

  await queueClient.createIfNotExists();

  const message: QueueTask = {
    task_type: taskType,
    payload: payload,
    priority: priority,
    timestamp: new Date().toISOString(),
    // Backward compatibility
    type: taskType
  };

  if (payload.requestedBy) {
      message.requestedBy = payload.requestedBy as string;
  }

  const messageString = JSON.stringify(message);
  const messageBase64 = Buffer.from(messageString).toString('base64');

  await queueClient.sendMessage(messageBase64);
  console.log(`✅ Task [${taskType}] sent to queue.`);
  
  return { queued: true, taskType, timestamp: message.timestamp };
  } catch (error) {
    console.error("❌ Failed to send task to scraper queue:", error);
    return { 
      queued: false, 
      reason: error instanceof Error ? error.message : "unknown_error" 
    };
  }
}

export async function sendToIntegrationQueue(taskType: TaskType, payload: Record<string, unknown>, priority: "normal" | "high" | "low" = "normal") {
  try {
    const queueServiceClient = getQueueServiceClient();
    const queueName = "integration-tasks";
    const queueClient = queueServiceClient.getQueueClient(queueName);

  await queueClient.createIfNotExists();

  const message: QueueTask = {
    task_type: taskType,
    payload: payload,
    priority: priority,
    timestamp: new Date().toISOString(),
    type: taskType
  };

  const messageString = JSON.stringify(message);
  const messageBase64 = Buffer.from(messageString).toString('base64');

  await queueClient.sendMessage(messageBase64);
  console.log(`✅ Task [${taskType}] sent to integration queue.`);
  
  return { queued: true, taskType, timestamp: message.timestamp };
  } catch (error) {
    console.error("❌ Failed to send task to integration queue:", error);
    return { 
      queued: false, 
      reason: error instanceof Error ? error.message : "unknown_error" 
    };
  }
}
