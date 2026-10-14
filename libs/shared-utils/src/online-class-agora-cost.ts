/**
 * Agora list prices for tutoring (pay-as-you-go, no monthly free allowances).
 * @see https://docs.agora.io/en/video-calling/overview/pricing
 * @see https://docs.agora.io/en/realtime-media/whiteboard/reference/pricing
 */
export const AGORA_RTC_FULL_HD_USD_PER_1000_PARTICIPANT_MINUTES = 8.99;
export const AGORA_WHITEBOARD_USD_PER_1000_USER_MINUTES = 1.4;

export type OnlineClassAgoraVideoTier = 'AUDIO' | 'HD' | 'FULL_HD' | '2K' | '2K_PLUS';

const RTC_USD_PER_1000_PARTICIPANT_MINUTES: Record<OnlineClassAgoraVideoTier, number> = {
  AUDIO: 0.99,
  HD: 3.99,
  FULL_HD: 8.99,
  '2K': 15.99,
  '2K_PLUS': 35.99,
};

export type EstimateOnlineClassAgoraCostInput = {
  /** Scheduled or actual class length in whole minutes. */
  durationMinutes: number;
  /** Tutor + students in the RTC channel (default 1:1 → 2). */
  participantCount?: number;
  /** Both sides use the interactive whiteboard for the same duration. */
  includeWhiteboard?: boolean;
  /** Assumed RTC subscription tier for every participant (Full HD for 1080p 1:1). */
  videoTier?: OnlineClassAgoraVideoTier;
};

function usdForUsageMinutes(minutes: number, usdPer1000: number): number {
  if (!(minutes > 0)) {
    return 0;
  }
  return (minutes / 1000) * usdPer1000;
}

/**
 * Estimated Agora vendor cost in USD (RTC + optional whiteboard).
 * Billing is per participant-minute (RTC) and per user-minute (whiteboard).
 */
export function estimateOnlineClassAgoraCostUsd(
  input: EstimateOnlineClassAgoraCostInput,
): { rtcUsd: number; whiteboardUsd: number; totalUsd: number } {
  const durationMinutes = Math.max(0, input.durationMinutes);
  const participantCount = Math.max(0, input.participantCount ?? 2);
  const includeWhiteboard = input.includeWhiteboard ?? true;
  const videoTier = input.videoTier ?? 'FULL_HD';

  const participantMinutes = durationMinutes * participantCount;
  const rtcUsd = usdForUsageMinutes(
    participantMinutes,
    RTC_USD_PER_1000_PARTICIPANT_MINUTES[videoTier],
  );

  const whiteboardUserMinutes = includeWhiteboard ? durationMinutes * participantCount : 0;
  const whiteboardUsd = usdForUsageMinutes(
    whiteboardUserMinutes,
    AGORA_WHITEBOARD_USD_PER_1000_USER_MINUTES,
  );

  const totalUsd = rtcUsd + whiteboardUsd;
  return { rtcUsd, whiteboardUsd, totalUsd };
}

export type SuggestTutorOnlineClassAgoraChargeInrInput = EstimateOnlineClassAgoraCostInput & {
  /** FX rate: INR per 1 USD. */
  usdToInrRate: number;
  /**
   * Buffer on top of vendor cost (e.g. 0.15 = 15%) for screen-share tier bumps,
   * FX drift, and Agora rounding.
   */
  markupRatio?: number;
};

/**
 * Suggested amount to debit from the tutor wallet (whole rupees, rounded up).
 */
export function suggestTutorOnlineClassAgoraChargeInr(
  input: SuggestTutorOnlineClassAgoraChargeInrInput,
): {
  vendorCostUsd: number;
  chargeInr: number;
  breakdown: { rtcUsd: number; whiteboardUsd: number };
} {
  const { rtcUsd, whiteboardUsd, totalUsd } = estimateOnlineClassAgoraCostUsd(input);
  const markupRatio = input.markupRatio ?? 0;
  const usdToInrRate = input.usdToInrRate;
  const chargeInr = Math.ceil(totalUsd * (1 + markupRatio) * usdToInrRate);
  return {
    vendorCostUsd: totalUsd,
    chargeInr,
    breakdown: { rtcUsd, whiteboardUsd },
  };
}

/** List-price vendor cost for a 60-minute Full HD 1:1 class with whiteboard (~$1.25 USD). */
export const AGORA_FULL_HD_60_MIN_ONE_TO_ONE_VENDOR_USD =
  estimateOnlineClassAgoraCostUsd({
    durationMinutes: 60,
    participantCount: 2,
    includeWhiteboard: true,
    videoTier: 'FULL_HD',
  }).totalUsd;
