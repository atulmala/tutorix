import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { RtcRole, RtcTokenBuilder, RtmTokenBuilder } from 'agora-token';
import { AgoraConfig, readAgoraConfig } from './agora.config';

@Injectable()
export class AgoraTokenService {
  constructor(private readonly config: AgoraConfig = readAgoraConfig()) {}

  rtcToken(channelName: string, uid: number, expireAt: Date, now = new Date()): string {
    this.requireRtc();
    const expireSeconds = expireSecondsUntil(expireAt, now);
    return RtcTokenBuilder.buildTokenWithUid(
      this.config.appId,
      this.config.appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expireSeconds,
      expireSeconds,
    );
  }

  rtmToken(uid: number, expireAt: Date, now = new Date()): string {
    this.requireRtc();
    return RtmTokenBuilder.buildToken(
      this.config.appId,
      this.config.appCertificate,
      String(uid),
      expireSecondsUntil(expireAt, now),
    );
  }

  private requireRtc(): void {
    if (!this.config.appId || !this.config.appCertificate) {
      throw new ServiceUnavailableException('Online classes are not configured');
    }
  }
}

function expireSecondsUntil(expireAt: Date, now: Date): number {
  return Math.max(1, Math.ceil((expireAt.getTime() - now.getTime()) / 1000));
}
