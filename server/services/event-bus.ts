/**
 * Event Bus — Azure Service Bus publisher
 *
 * Publishes domain events to two queues:
 *   rfq-events      → RFQ lifecycle events
 *   supplier-events → supplier approval + EPD ingestion
 *
 * Auth: DefaultAzureCredential (managed identity in prod, AzureCliCredential locally).
 * No connection string — never put Service Bus keys in env vars.
 *
 * Graceful no-op when SERVICE_BUS_NAMESPACE is unset (local dev without az login).
 * Never throws — all errors logged; callers always fire-and-forget.
 *
 * Azure setup:
 *   1. Create Service Bus namespace in Azure Portal
 *   2. Add app setting: SERVICE_BUS_NAMESPACE=<name>.servicebus.windows.net
 *   3. Grant the app's managed identity "Azure Service Bus Data Sender" on the namespace
 */

import { DefaultAzureCredential } from "@azure/identity";
import { ServiceBusClient, type ServiceBusSender } from "@azure/service-bus";
import { ENV } from "../_core/env";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RfqEvent =
  | { type: "rfq.created";   rfqId: number; supplierId: number; buyerId: number }
  | { type: "rfq.responded"; rfqId: number; status: string }
  | { type: "rfq.cancelled"; rfqId: number };

export type SupplierEvent =
  | { type: "supplier.approved"; supplierId: number }
  | { type: "supplier.rejected"; supplierId: number }
  | { type: "epd.ingested";      epdId: number; supplierId: number };

// ─── Client (lazy singleton) ──────────────────────────────────────────────────

let _client: ServiceBusClient | null = null;

function getClient(): ServiceBusClient | null {
  const ns = ENV.serviceBusNamespace;
  if (!ns) return null; // no-op in local dev without the namespace configured
  if (!_client) {
    _client = new ServiceBusClient(ns, new DefaultAzureCredential());
  }
  return _client;
}

// ─── Internal publish helper ──────────────────────────────────────────────────

async function publish(queue: string, body: RfqEvent | SupplierEvent): Promise<void> {
  const client = getClient();
  if (!client) return; // no-op in dev when env var is not set

  let sender: ServiceBusSender | null = null;
  try {
    sender = client.createSender(queue);
    await sender.sendMessages({
      body,
      contentType: "application/json",
      subject: body.type,
    });
  } finally {
    await sender?.close();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Publish an RFQ lifecycle event.
 * Always call with void + .catch() — never await in request path.
 *
 * @example
 * void publishRfqEvent({ type: "rfq.created", rfqId: 1, supplierId: 2, buyerId: 3 })
 *   .catch(err => console.error("[event-bus]", err));
 */
export async function publishRfqEvent(event: RfqEvent): Promise<void> {
  await publish("rfq-events", event);
}

/**
 * Publish a supplier lifecycle event.
 * Always call with void + .catch() — never await in request path.
 *
 * @example
 * void publishSupplierEvent({ type: "epd.ingested", epdId: 5, supplierId: 1 })
 *   .catch(err => console.error("[event-bus]", err));
 */
export async function publishSupplierEvent(event: SupplierEvent): Promise<void> {
  await publish("supplier-events", event);
}
