import { Injectable, Logger } from '@nestjs/common';
import { AgoraConfig, readAgoraConfig } from './agora.config';

type FetchLike = typeof fetch;

let fetchImpl: FetchLike = fetch;

/** Tests replace the Agora HTTP client without going through Nest. */
export function setAgoraFetchForTests(next: FetchLike): void {
  fetchImpl = next;
}

/**
 * Agora channel management. Failures are swallowed by the caller so a join
 * token is still issued when the REST API is unavailable.
 */
@Injectable()
export class AgoraRestClient {
  private readonly logger = new Logger(AgoraRestClient.name);

  constructor(private readonly config: AgoraConfig = readAgoraConfig()) {}

  async kickUnauthorized(channelName: string, allowedUids: number[]): Promise<void> {
    if (!this.config.appId || !this.config.customerKey || !this.config.customerSecret) {
      return;
    }
    try {
      const present = await this.listChannelUsers(channelName);
      const allowed = new Set(allowedUids);
      for (const uid of present) {
        if (!allowed.has(uid)) {
          await this.kickUser(channelName, uid);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Agora channel management failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async listChannelUsers(channelName: string): Promise<number[]> {
    const url = `https://api.agora.io/dev/v1/channel/user/${this.config.appId}/${encodeURIComponent(channelName)}`;
    const response = await fetchImpl(url, { headers: { Authorization: this.basicAuth() } });
    if (!response.ok) {
      throw new Error(`Agora channel query failed (${response.status})`);
    }
    const body = (await response.json()) as {
      data?: { users?: number[]; broadcasters?: number[]; audience?: number[] };
    };
    const data = body.data;
    return [
      ...(data?.users ?? []),
      ...(data?.broadcasters ?? []),
      ...(data?.audience ?? []),
    ].filter((uid) => Number.isInteger(uid));
  }

  /** Remove everyone from the channel so a tutor-ended class cannot continue. */
  async kickChannel(channelName: string, banMinutes: number): Promise<void> {
    if (!this.config.appId || !this.config.customerKey || !this.config.customerSecret) {
      return;
    }
    const response = await fetchImpl('https://api.agora.io/dev/v1/kicking-rule', {
      method: 'POST',
      headers: {
        Authorization: this.basicAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appid: this.config.appId,
        cname: channelName,
        time: banMinutes,
        privileges: ['join_channel'],
      }),
    });
    if (!response.ok) {
      throw new Error(`Agora channel kick failed (${response.status})`);
    }
  }

  private async kickUser(channelName: string, uid: number): Promise<void> {
    const response = await fetchImpl('https://api.agora.io/dev/v1/kicking-rule', {
      method: 'POST',
      headers: {
        Authorization: this.basicAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appid: this.config.appId,
        cname: channelName,
        uid,
        time: 5,
        privileges: ['join_channel'],
      }),
    });
    if (!response.ok) {
      this.logger.warn(`Agora kick failed for uid ${uid} (${response.status})`);
    }
  }

  private basicAuth(): string {
    const raw = `${this.config.customerKey}:${this.config.customerSecret}`;
    return `Basic ${Buffer.from(raw).toString('base64')}`;
  }
}
