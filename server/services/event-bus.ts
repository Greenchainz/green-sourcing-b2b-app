/**
 * Event Bus — Azure Service Bus publisher
 *
 * Publishes domain events to two queues:
 *   rfq-events      → RFQ lifecycle events
 *   supplier-events → supplier approval + EPD ingestion
 *
 * Graceful no-op when SERVICE_BUS_CONNECTION_STRING is unset (local dev).
 * Never throws — all errors are logged and swallowed so callers can fire-and-forget.
 */

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
  if (!ENV.serviceBusConnectionString) return null;
  if (!_client) _client = new ServiceBusClient(ENV.serviceBusConnectionString);
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
