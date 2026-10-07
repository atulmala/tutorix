import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request } from 'express';
import { readAgoraConfig } from './agora.config';
import {
  AgoraRtcChannelNotice,
  agoraRtcWebhookSignatureMatches,
} from './agora-rtc-webhook.util';
import { OnlineClassPresenceService } from './online-class-presence.service';

type RawBodyRequest = Request & { body: Buffer };

@Controller('webhooks')
export class AgoraRtcWebhookController {
  private readonly logger = new Logger(AgoraRtcWebhookController.name);

  constructor(private readonly presenceService: OnlineClassPresenceService) {}

  @Post('agora/rtc')
  @HttpCode(200)
  async handleAgoraRtcWebhook(
    @Req() req: RawBodyRequest,
    @Headers('agora-signature') signature: string | undefined,
    @Headers('agora-signature-v2') signatureV2: string | undefined,
  ): Promise<{ received: true }> {
    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      throw new BadRequestException('Invalid webhook payload');
    }

    const secret = readAgoraConfig().rtcWebhookSecret;
    if (!secret) {
      throw new ServiceUnavailableException('Agora webhook secret is not configured');
    }

    const signed =
      agoraRtcWebhookSignatureMatches(rawBody, secret, signatureV2) ||
      agoraRtcWebhookSignatureMatches(rawBody, secret, signature);
    if (!signed) {
      throw new BadRequestException('Invalid Agora webhook signature');
    }

    let notice: AgoraRtcChannelNotice;
    try {
      notice = JSON.parse(rawBody.toString('utf8')) as AgoraRtcChannelNotice;
    } catch {
      throw new BadRequestException('Invalid webhook JSON');
    }

    const result = await this.presenceService.ingest(notice);
    this.logger.debug(
      `Agora RTC notice ${notice.noticeId ?? '(none)'} event ${notice.eventType ?? '(none)'}: ${result}`,
    );
    return { received: true };
  }
}
