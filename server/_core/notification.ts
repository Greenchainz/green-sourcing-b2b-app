import { TRPCError } from "@trpc/server";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }
  return { title, content };
};

/**
 * Owner notification — emails the founder via email-service
 * (Resend primary, Zeptomail SMTP fallback). Returns false instead of
 * throwing so admin procedures degrade gracefully if delivery fails.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  try {
    const { sendEmail } = await import("../email-service");
    const ok = await sendEmail({
      to: "founder@greenchainz.com",
      subject: title,
      html: `<p>${content.replace(/\n/g, "<br>")}</p>`,
    });
    if (!ok) console.warn(`[notifyOwner] Email delivery failed — title: "${title}"`);
    return ok;
  } catch (err) {
    console.error("[notifyOwner] Failed to send owner email:", err);
    return false;
  }
}
