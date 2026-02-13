import { getDb } from "./db";
import { notifications } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export type NotificationType = "rfq_new" | "rfq_match" | "new_message" | "bid_accepted" | "bid_rejected" | "rfq_closed" | "rfq_bid_received";

export interface NotificationPayload {
  userId: number;
  type: NotificationType;
  title: string;
  content: string;
  relatedId?: number;
  email?: string;
  phone?: string;
}

/**
 * Send in-app notification
 */
export async function sendInAppNotification(payload: NotificationPayload) {
  const db = await getDb();
  
  if (!db) {
    return { success: false, error: "Database connection failed" };
  }
  
  try {
    const result = await db.insert(notifications).values({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      content: payload.content,
      relatedRfqId: payload.relatedId,
      isRead: 0,
    });
    
    // Broadcast notification in real-time via WebPubSub
    try {
      const { broadcastNotification } = await import('./webpubsub-manager');
      await broadcastNotification(payload.userId, {
        id: Date.now(), // Use timestamp as temp ID for real-time notification
        type: payload.type,
        title: payload.title,
        content: payload.content,
        relatedRfqId: payload.relatedId,
        createdAt: new Date().toISOString(),
      });
    } catch (broadcastError) {
      console.warn("⚠️ Failed to broadcast notification (non-critical):", broadcastError);
    }
    
    console.log(`✅ In-app notification sent to user ${payload.userId}`);
    return { success: true, notificationId: 0 };
  } catch (error) {
    console.error("❌ Failed to send in-app notification:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send email notification via Azure SendGrid
 * In production, integrate with Azure Communication Services
 */
export async function sendEmailNotification(payload: NotificationPayload) {
  if (!payload.email) {
    console.warn("⚠️ No email provided for notification");
    return { success: false, error: "No email provided" };
  }

  try {
    // TODO: Integrate with Azure Communication Services / SendGrid
    // For now, log the notification
    console.log(`📧 Email notification queued:`, {
      to: payload.email,
      subject: payload.title,
      body: payload.content,
    });
    
    return { success: true, message: "Email queued for delivery" };
  } catch (error) {
    console.error("❌ Failed to send email notification:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send SMS notification via Azure Communication Services
 */
export async function sendSmsNotification(payload: NotificationPayload) {
  if (!payload.phone) {
    console.warn("⚠️ No phone number provided for SMS notification");
    return { success: false, error: "No phone number provided" };
  }

  try {
    // TODO: Integrate with Azure Communication Services
    // For now, log the notification
    console.log(`📱 SMS notification queued:`, {
      to: payload.phone,
      message: `${payload.title}: ${payload.content}`,
    });
    
    return { success: true, message: "SMS queued for delivery" };
  } catch (error) {
    console.error("❌ Failed to send SMS notification:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send multi-channel notification (in-app + email + SMS)
 */
export async function sendNotification(payload: NotificationPayload) {
  const results = {
    inApp: await sendInAppNotification(payload),
    email: payload.email ? await sendEmailNotification(payload) : null,
    sms: payload.phone ? await sendSmsNotification(payload) : null,
  };

  return results;
}

/**
 * Generate notification content based on type
 */
export function generateNotificationContent(
  type: NotificationType,
  data: Record<string, any>
): { title: string; content: string } {
  switch (type) {
    case "rfq_match":
      return {
        title: `New RFQ Match: ${data.projectName || "New Project"}`,
        content: `Your filters match a new RFQ from ${data.buyerName || "a buyer"} in ${data.location || "your area"}. ${data.materialCount || 0} materials needed.`,
      };

    case "new_message":
      return {
        title: `New message from ${data.senderName}`,
        content: `"${data.messagePreview}"`,
      };

    case "bid_accepted":
      return {
        title: `Your bid was accepted!`,
        content: `Congratulations! Your bid of $${data.bidPrice} for ${data.projectName} was accepted.`,
      };

    case "bid_rejected":
      return {
        title: `Bid not selected`,
        content: `Your bid for ${data.projectName} was not selected. Another supplier's bid was chosen.`,
      };

    case "rfq_closed":
      return {
        title: `RFQ Closed: ${data.projectName}`,
        content: `The RFQ has been closed. Winning bid: $${data.winningBid} from ${data.winningSupplier}.`,
      };

    default:
      return {
        title: "Notification",
        content: "You have a new notification",
      };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  
  if (!db) {
    return { success: false, error: "Database connection failed" };
  }
  
  try {
    await db
      .update(notifications)
      .set({
        isRead: 1,
        readAt: new Date(),
      })
      .where(eq(notifications.id, notificationId));
    
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to mark notification as read:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get user's unread notifications
 */
export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  
  if (!db) {
    return [];
  }
  
  try {
    const unread = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(notifications.createdAt);
    
    return unread;
  } catch (error) {
    console.error("❌ Failed to fetch unread notifications:", error);
    return [];
  }
}

/**
 * Get count of user's unread notifications
 */
export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  
  if (!db) {
    return 0;
  }
  
  try {
    const unread = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));
    
    return unread.length;
  } catch (error) {
    console.error("❌ Failed to count unread notifications:", error);
    return 0;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  
  if (!db) {
    return { success: false, error: "Database connection failed" };
  }
  
  try {
    await db
      .update(notifications)
      .set({ isRead: 1 })
      .where(eq(notifications.userId, userId));
    
    console.log(`✅ Marked all notifications as read for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to mark all notifications as read:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Generate email template for RFQ match
 */
export function generateRfqMatchEmail(data: {
  supplierName: string;
  projectName: string;
  location: string;
  materials: string[];
  dueDate: string;
  matchScore: number;
}): string {
  return `
    <h2>New RFQ Match: ${data.projectName}</h2>
    <p>Hi ${data.supplierName},</p>
    <p>A new RFQ matches your filters and premium supplier status!</p>
    
    <h3>Project Details</h3>
    <ul>
      <li><strong>Project:</strong> ${data.projectName}</li>
      <li><strong>Location:</strong> ${data.location}</li>
      <li><strong>Due Date:</strong> ${data.dueDate}</li>
      <li><strong>Match Score:</strong> ${data.matchScore}%</li>
    </ul>
    
    <h3>Materials Needed</h3>
    <ul>
      ${data.materials.map((m) => `<li>${m}</li>`).join("")}
    </ul>
    
    <p><a href="https://greenchainz.com/supplier-dashboard">View RFQ & Submit Bid</a></p>
    <p>Best regards,<br>GreenChainz Team</p>
  `;
}

/**
 * Generate email template for bid accepted
 */
export function generateBidAcceptedEmail(data: {
  supplierName: string;
  projectName: string;
  bidPrice: number;
  leadDays: number;
}): string {
  return `
    <h2>Your Bid Was Accepted! 🎉</h2>
    <p>Hi ${data.supplierName},</p>
    <p>Congratulations! Your bid for <strong>${data.projectName}</strong> has been accepted.</p>
    
    <h3>Bid Details</h3>
    <ul>
      <li><strong>Bid Price:</strong> $${data.bidPrice.toLocaleString()}</li>
      <li><strong>Lead Time:</strong> ${data.leadDays} days</li>
    </ul>
    
    <p>The buyer will contact you shortly with delivery details. You can view the conversation thread in your dashboard.</p>
    
    <p><a href="https://greenchainz.com/supplier-dashboard">View in Dashboard</a></p>
    <p>Best regards,<br>GreenChainz Team</p>
  `;
}

/**
 * Generate email template for new message
 */
export function generateNewMessageEmail(data: {
  recipientName: string;
  senderName: string;
  messagePreview: string;
  projectName: string;
}): string {
  return `
    <h2>New Message from ${data.senderName}</h2>
    <p>Hi ${data.recipientName},</p>
    <p>You have a new message regarding <strong>${data.projectName}</strong>.</p>
    
    <blockquote style="border-left: 4px solid #4CAF50; padding-left: 16px; margin: 16px 0;">
      "${data.messagePreview}"
    </blockquote>
    
    <p><a href="https://greenchainz.com/rfq-dashboard">Reply in Dashboard</a></p>
    <p>Best regards,<br>GreenChainz Team</p>
  `;
}
