import { QueueServiceClient } from "@azure/storage-queue";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

export type TaskType = 
  | "scrape_supplier" 
  | "scrape_url" 
  | "sync_ec3" 
  | "sync_epd" 
  | "process_document"
  | "data_janitor";

export interface QueueTask {
  type: TaskType;
  payload: Record<string, unknown>;
  timestamp: string;
  requestedBy?: string;
}

export async function sendToScraperQueue(taskType: TaskType, payload: Record<string, unknown>) {
  if (!connectionString) {
    console.warn("⚠️ AZURE_STORAGE_CONNECTION_STRING not set - task not queued");
    return { queued: false, reason: "no_connection_string" };
  }

  const queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
  const queueName = "scraper-tasks";
  const queueClient = queueServiceClient.getQueueClient(queueName);

  await queueClient.createIfNotExists();

  const message: QueueTask = {
    type: taskType,
    payload: payload,
    timestamp: new Date().toISOString()
  };

  const messageString = JSON.stringify(message);
  const messageBase64 = Buffer.from(messageString).toString('base64');

  await queueClient.sendMessage(messageBase64);
  console.log(`✅ Task [${taskType}] sent to queue.`);
  
  return { queued: true, taskType, timestamp: message.timestamp };
}

export async function sendToIntegrationQueue(taskType: TaskType, payload: Record<string, unknown>) {
  if (!connectionString) {
    console.warn("⚠️ AZURE_STORAGE_CONNECTION_STRING not set - task not queued");
    return { queued: false, reason: "no_connection_string" };
  }

  const queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
  const queueName = "integration-tasks";
  const queueClient = queueServiceClient.getQueueClient(queueName);

  await queueClient.createIfNotExists();

  const message: QueueTask = {
    type: taskType,
    payload: payload,
    timestamp: new Date().toISOString()
  };

  const messageString = JSON.stringify(message);
  const messageBase64 = Buffer.from(messageString).toString('base64');

  await queueClient.sendMessage(messageBase64);
  console.log(`✅ Task [${taskType}] sent to integration queue.`);
  
  return { queued: true, taskType, timestamp: message.timestamp };
}
