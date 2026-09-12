import { createNotification } from "@/lib/services/notification.service";
import type { NotificationType } from "@prisma/client";

export interface NotificationRecipient {
  userId?: string;
  phone?: string;
  email?: string;
}

export interface NotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
}

export interface NotificationChannel {
  readonly name: string;
  send(recipient: NotificationRecipient, payload: NotificationPayload): Promise<void>;
}

/** The only channel actually wired up right now. */
export class InAppChannel implements NotificationChannel {
  readonly name = "IN_APP";

  async send(recipient: NotificationRecipient, payload: NotificationPayload): Promise<void> {
    if (!recipient.userId) {
      throw new Error("InAppChannel requires a userId.");
    }
    await createNotification({
      userId: recipient.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
    });
  }
}

/**
 * Prepared for a future WhatsApp Business API / Fonnte / Twilio
 * integration (spec §52). Deliberately throws instead of silently
 * no-op'ing or pretending to send — callers must not assume a
 * message actually reached anyone until a real provider is wired in.
 */
export class WhatsAppChannel implements NotificationChannel {
  readonly name = "WHATSAPP";

  async send(): Promise<void> {
    throw new Error(
      "Channel WhatsApp belum terhubung ke provider (mis. WhatsApp Business API, Fonnte, atau Twilio). " +
        "Implementasikan kredensial provider sebelum mengaktifkan channel ini."
    );
  }
}

/** Prepared for a future SMTP/SES/Resend integration. */
export class EmailChannel implements NotificationChannel {
  readonly name = "EMAIL";

  async send(): Promise<void> {
    throw new Error(
      "Channel Email belum terhubung ke provider (mis. SMTP, Amazon SES, atau Resend)."
    );
  }
}

/** Prepared for a future web-push / FCM integration. */
export class PushNotificationChannel implements NotificationChannel {
  readonly name = "PUSH";

  async send(): Promise<void> {
    throw new Error("Channel Push Notification belum terhubung ke provider (mis. FCM atau Web Push).");
  }
}

/**
 * Fan-out helper: sends through every given channel, but never lets
 * one channel's failure (e.g. WhatsApp not configured yet) block the
 * others — the in-app notification should still land even if
 * WhatsApp/Email aren't wired up.
 */
export async function sendViaChannels(
  channels: NotificationChannel[],
  recipient: NotificationRecipient,
  payload: NotificationPayload
): Promise<{ channel: string; success: boolean; error?: string }[]> {
  const results = await Promise.all(
    channels.map(async (channel) => {
      try {
        await channel.send(recipient, payload);
        return { channel: channel.name, success: true };
      } catch (err) {
        return {
          channel: channel.name,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    })
  );
  return results;
}
