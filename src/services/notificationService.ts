/**
 * Notification Service Abstraction
 * Handles WhatsApp and SMS dispatches for table allocation events and queue milestones.
 * Includes formatted message generation, audit logging, and preview capabilities.
 */

import { NotificationRecord } from '../types/database';

export interface WhatsAppNotificationPayload {
  restaurantName: string;
  customerName: string;
  phone: string;
  tokenNumber: string;
  tableNumber: string;
  partySize: number;
}

export interface NotificationResult {
  success: boolean;
  messageId: string;
  formattedMessage: string;
  timestamp: string;
}

/**
 * Generates the standardized WhatsApp table allocation message template
 */
export function formatAllocationWhatsAppMessage(
  restaurantName: string,
  tableNumber: string,
  customerName?: string
): string {
  const greeting = customerName ? `Hello ${customerName}!` : 'Hello!';
  return (
`🎉 Great news!

${greeting} Your table is ready.
Please make your way to the host stand.

Table: ${tableNumber}

We look forward to serving you at ${restaurantName}!`
  );
}

/**
 * Sends a WhatsApp notification for an allocated table.
 * In this prototype, it formats the real production template, logs to system audit,
 * and returns a persistent NotificationRecord.
 */
export async function sendTableAllocationWhatsApp(
  payload: WhatsAppNotificationPayload,
  queueEntryId: string,
  restaurantId: string
): Promise<{ result: NotificationResult; record: NotificationRecord }> {
  const formattedMessage = formatAllocationWhatsAppMessage(
    payload.restaurantName,
    payload.tableNumber,
    payload.customerName
  );

  const messageId = 'wa_' + Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();

  // Audit log for staff inspection
  console.log(`[WHATSAPP DISPATCH] To: ${payload.phone} (${payload.customerName})`);
  console.log(formattedMessage);

  const record: NotificationRecord = {
    id: messageId,
    restaurant_id: restaurantId,
    queue_entry_id: queueEntryId,
    channel: 'WHATSAPP',
    recipient: payload.phone,
    message: formattedMessage,
    status: 'SENT',
    created_at: now,
  };

  return {
    result: {
      success: true,
      messageId,
      formattedMessage,
      timestamp: now,
    },
    record,
  };
}
