import { QueueServiceClient } from "@azure/storage-queue";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

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
  if (!connectionString) {
    console.warn("⚠️ AZURE_STORAGE_CONNECTION_STRING not set - task not queued");
    return { queued: false, reason: "no_connection_string" };
  }

  const queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
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
}

export async function sendToIntegrationQueue(taskType: TaskType, payload: Record<string, unknown>, priority: "normal" | "high" | "low" = "normal") {
  if (!connectionString) {
    console.warn("⚠️ AZURE_STORAGE_CONNECTION_STRING not set - task not queued");
    return { queued: false, reason: "no_connection_string" };
  }

  const queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
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
}
