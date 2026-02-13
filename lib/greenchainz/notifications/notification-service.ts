/**
 * GreenChainz Notification Service
 *
 * Handles in-app notifications and email template generation
 * for RFQ lifecycle events, messaging, and bid management.
 *
 * Ported from Manus prototype. Uses PostgreSQL via lib/db.ts.
 */
import { query, queryMany, queryOne } from "../../db";

// ─── Types ───────────────────────────────────────────────────────────────────

export type NotificationType =
  | "rfq_new"
  | "rfq_match"
  | "new_message"
  | "bid_accepted"
  | "bid_rejected"
  | "rfq_closed";

export interface NotificationPayload {
  userId: number;
  type: NotificationType;
  title: string;
  content: string;
  relatedId?: number;
  email?: string;
  phone?: string;
}

// ─── In-App Notifications ────────────────────────────────────────────────────

/**
 * Send in-app notification (insert into notifications table).
 */
export async function sendInAppNotification(
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, content, related_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [payload.userId, payload.type, payload.title, payload.content, payload.relatedId ?? null]
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to send notification:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Mark notification as read.
 */
export async function markNotificationAsRead(
  notificationId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await query(
      "UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1",
      [notificationId]
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get user's unread notifications.
 */
export async function getUnreadNotifications(userId: number) {
  return queryMany(
    "SELECT * FROM notifications WHERE user_id = $1 AND is_read = false ORDER BY created_at DESC",
    [userId]
  );
}

/**
 * Get count of user's unread notifications.
 */
export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const result = await queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false",
    [userId]
  );
  return parseInt(result?.count || "0", 10);
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsAsRead(userId: number) {
  try {
    await query(
      "UPDATE notifications SET is_read = true WHERE user_id = $1",
      [userId]
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return { success: false, error: String(error) };
  }
}

// ─── Notification Content Generators ─────────────────────────────────────────

/**
 * Generate notification content based on type and data.
 */
export function generateNotificationContent(
  type: NotificationType,
  data: Record<string, any>
): { title: string; content: string } {
  switch (type) {
    case "rfq_new":
      return {
        title: `New RFQ: ${data.projectName}`,
        content: `A new RFQ has been submitted for ${data.projectName} in ${data.location}. ${data.materialCount} materials requested.`,
      };
    case "rfq_match":
      return {
        title: `RFQ Match: ${data.projectName}`,
        content: `Your profile matches a new RFQ for ${data.projectName}. Match score: ${data.matchScore}%. Review and submit your bid.`,
      };
    case "new_message":
      return {
        title: `New Message from ${data.senderName}`,
        content: `${data.senderName} sent you a message regarding ${data.projectName}: "${data.messagePreview}"`,
      };
    case "bid_accepted":
      return {
        title: `Bid Accepted: ${data.projectName}`,
        content: `Congratulations! Your bid of $${data.bidPrice} for ${data.projectName} has been accepted.`,
      };
    case "bid_rejected":
      return {
        title: `Bid Update: ${data.projectName}`,
        content: `Your bid for ${data.projectName} was not selected. The buyer chose another supplier.`,
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

// ─── Email Templates ─────────────────────────────────────────────────────────

/**
 * Generate email template for RFQ match notification.
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
 * Generate email template for bid accepted notification.
 */
export function generateBidAcceptedEmail(data: {
  supplierName: string;
  projectName: string;
  bidPrice: number;
  leadDays: number;
}): string {
  return `
    <h2>Your Bid Was Accepted!</h2>
    <p>Hi ${data.supplierName},</p>
    <p>Congratulations! Your bid for <strong>${data.projectName}</strong> has been accepted.</p>
    
    <h3>Bid Details</h3>
    <ul>
      <li><strong>Bid Price:</strong> $${data.bidPrice.toLocaleString()}</li>
      <li><strong>Lead Time:</strong> ${data.leadDays} days</li>
    </ul>
    
    <p>The buyer will contact you shortly with delivery details.</p>
    
    <p><a href="https://greenchainz.com/supplier-dashboard">View in Dashboard</a></p>
    <p>Best regards,<br>GreenChainz Team</p>
  `;
}

/**
 * Generate email template for new message notification.
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
