import { eq, inArray } from "drizzle-orm";
import { appSettings, users } from "../drizzle/schema";
import { normalizePhoneE164 } from "./acs-config";
import { sendSms } from "./acs-sms-service";
import { getDb } from "./db";

const MISSED_CALL_FORWARD_ENABLED_KEY = "comms.missedCallForwarding.enabled";
const MISSED_CALL_FORWARD_PHONE_KEY = "comms.missedCallForwarding.phone";
const DEFAULT_MISSED_CALL_FORWARD_PHONE = "+14343592460";

export interface MissedCallForwardingSettings {
  enabled: boolean;
  phone: string;
}

function parseEnabled(value: string | undefined): boolean {
  return value === "true";
}

export async function getMissedCallForwardingSettings(): Promise<MissedCallForwardingSettings> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({ key: appSettings.key, value: appSettings.value })
    .from(appSettings)
    .where(
      inArray(appSettings.key, [
        MISSED_CALL_FORWARD_ENABLED_KEY,
        MISSED_CALL_FORWARD_PHONE_KEY,
      ]),
    );

  const enabledRow = rows.find((row) => row.key === MISSED_CALL_FORWARD_ENABLED_KEY);
  const phoneRow = rows.find((row) => row.key === MISSED_CALL_FORWARD_PHONE_KEY);

  const fallbackPhone =
    normalizePhoneE164(process.env.MISSED_CALL_FORWARD_PHONE ?? "") ??
    DEFAULT_MISSED_CALL_FORWARD_PHONE;

  return {
    enabled: parseEnabled(enabledRow?.value),
    phone: normalizePhoneE164(phoneRow?.value ?? "") ?? fallbackPhone,
  };
}

export async function setMissedCallForwardingSettings(input: {
  enabled: boolean;
  phone?: string;
}): Promise<MissedCallForwardingSettings> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const current = await getMissedCallForwardingSettings();
  const normalizedPhone = normalizePhoneE164(input.phone ?? current.phone);
  if (!normalizedPhone) {
    throw new Error("A valid US phone number is required for missed-call forwarding.");
  }

  await db
    .insert(appSettings)
    .values({
      key: MISSED_CALL_FORWARD_ENABLED_KEY,
      value: input.enabled ? "true" : "false",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: input.enabled ? "true" : "false", updatedAt: new Date() },
    });

  await db
    .insert(appSettings)
    .values({
      key: MISSED_CALL_FORWARD_PHONE_KEY,
      value: normalizedPhone,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: normalizedPhone, updatedAt: new Date() },
    });

  return { enabled: input.enabled, phone: normalizedPhone };
}

function truncateForSms(text: string, maxLength = 160): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

export async function sendMissedCallForwardingSms(params: {
  callerId: number;
  calleeId: number;
  callType: "voice" | "video";
}): Promise<void> {
  const settings = await getMissedCallForwardingSettings();
  if (!settings.enabled) return;

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const callerRows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, params.callerId))
    .limit(1);

  const calleeRows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, params.calleeId))
    .limit(1);

  const callerLabel =
    callerRows[0]?.name?.trim() ||
    callerRows[0]?.email?.trim() ||
    `User ${params.callerId}`;
  const calleeLabel =
    calleeRows[0]?.name?.trim() ||
    calleeRows[0]?.email?.trim() ||
    `User ${params.calleeId}`;

  const message = truncateForSms(
    `GreenChainz missed ${params.callType} call: ${callerLabel} called ${calleeLabel}. Open Messages to reconnect.`,
  );

  const result = await sendSms(settings.phone, message);
  if (!result.success) {
    throw new Error(result.error ?? "Failed to send missed-call forwarding SMS");
  }
}
