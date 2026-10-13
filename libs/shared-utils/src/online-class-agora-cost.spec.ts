import {
  AGORA_FULL_HD_60_MIN_ONE_TO_ONE_VENDOR_USD,
  estimateOnlineClassAgoraCostUsd,
  suggestTutorOnlineClassAgoraChargeInr,
} from './online-class-agora-cost';

describe('online-class-agora-cost', () => {
  it('estimates Full HD 60 min 1:1 RTC + whiteboard at Agora list rates', () => {
    const { rtcUsd, whiteboardUsd, totalUsd } = estimateOnlineClassAgoraCostUsd({
      durationMinutes: 60,
      participantCount: 2,
      includeWhiteboard: true,
      videoTier: 'FULL_HD',
    });
    expect(rtcUsd).toBeCloseTo((120 / 1000) * 8.99, 5);
    expect(whiteboardUsd).toBeCloseTo((120 / 1000) * 1.4, 5);
    expect(totalUsd).toBeCloseTo(rtcUsd + whiteboardUsd, 5);
    expect(AGORA_FULL_HD_60_MIN_ONE_TO_ONE_VENDOR_USD).toBe(totalUsd);
  });

  it('scales linearly with duration', () => {
    const thirty = estimateOnlineClassAgoraCostUsd({
      durationMinutes: 30,
      participantCount: 2,
      videoTier: 'FULL_HD',
    });
    const sixty = estimateOnlineClassAgoraCostUsd({
      durationMinutes: 60,
      participantCount: 2,
      videoTier: 'FULL_HD',
    });
    expect(sixty.totalUsd).toBeCloseTo(thirty.totalUsd * 2, 5);
  });

  it('suggests tutor charge in INR with markup, rounded up', () => {
    const { chargeInr, vendorCostUsd } = suggestTutorOnlineClassAgoraChargeInr({
      durationMinutes: 60,
      participantCount: 2,
      videoTier: 'FULL_HD',
      includeWhiteboard: true,
      usdToInrRate: 85,
      markupRatio: 0.15,
    });
    expect(vendorCostUsd).toBeCloseTo(AGORA_FULL_HD_60_MIN_ONE_TO_ONE_VENDOR_USD, 5);
    expect(chargeInr).toBe(Math.ceil(vendorCostUsd * 1.15 * 85));
  });
});
