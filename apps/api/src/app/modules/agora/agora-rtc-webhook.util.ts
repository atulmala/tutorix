import { createHmac, timingSafeEqual } from 'crypto';

/** Communication-mode channel notifications. Live-broadcast 103/104 are not used. */
export const AGORA_RTC_JOIN_EVENT = 107;
export const AGORA_RTC_LEAVE_EVENT = 108;

export type AgoraRtcChannelNotice = {
  noticeId?: string;
  eventType?: number;
  payload?: {
    channelName?: string;
    uid?: number | string;
    ts?: number;
    duration?: number;
    reason?: number;
  };
};

export function agoraRtcWebhookSignature(rawBody: Buffer | string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

/** True when the header matches HMAC-SHA256 of the raw body. */
export function agoraRtcWebhookSignatureMatches(
  rawBody: Buffer | string,
  secret: string,
  signature: string | undefined,
): boolean {
  if (!secret || !signature?.trim()) {
    return false;
  }
  const expected = Buffer.from(agoraRtcWebhookSignature(rawBody, secret), 'utf8');
  const received = Buffer.from(signature.trim().toLowerCase(), 'utf8');
  if (expected.length !== received.length) {
    return false;
  }
  return timingSafeEqual(expected, received);
}

/** `class-{sessionId}` only. Other Agora channels are not class usage. */
export function sessionIdFromAgoraChannel(channelName: string | undefined): number | null {
  if (!channelName) {
    return null;
  }
  const match = /^class-(\d+)$/.exec(channelName);
  if (!match) {
    return null;
  }
  const sessionId = Number(match[1]);
  return Number.isInteger(sessionId) && sessionId > 0 ? sessionId : null;
}

export function agoraNoticeTimestamp(ts: number | undefined): Date | null {
  if (ts == null || !Number.isFinite(ts)) {
    return null;
  }
  const millis = ts > 1_000_000_000_000 ? ts : ts * 1000;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function agoraLeaveDurationSeconds(duration: number | undefined): number | null {
  if (duration == null || !Number.isFinite(duration) || duration < 0) {
    return null;
  }
  return Math.floor(duration);
}
