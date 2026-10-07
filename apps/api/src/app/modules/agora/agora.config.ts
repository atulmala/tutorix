export type AgoraConfig = {
  appId: string;
  appCertificate: string;
  customerKey: string;
  customerSecret: string;
  whiteboardAppIdentifier: string;
  whiteboardAk: string;
  whiteboardSk: string;
  whiteboardRegion: string;
  /** HMAC secret for RTC channel event callbacks. Empty until set in the environment. */
  rtcWebhookSecret: string;
};

export function readAgoraConfig(env: NodeJS.ProcessEnv = process.env): AgoraConfig {
  return {
    appId: env.AGORA_APP_ID?.trim() ?? '',
    appCertificate: env.AGORA_APP_CERTIFICATE?.trim() ?? '',
    customerKey: env.AGORA_CUSTOMER_KEY?.trim() ?? '',
    customerSecret: env.AGORA_CUSTOMER_SECRET?.trim() ?? '',
    whiteboardAppIdentifier: env.AGORA_WHITEBOARD_APP_IDENTIFIER?.trim() ?? '',
    whiteboardAk: env.AGORA_WHITEBOARD_AK?.trim() ?? '',
    whiteboardSk: env.AGORA_WHITEBOARD_SK?.trim() ?? '',
    whiteboardRegion: env.AGORA_WHITEBOARD_REGION?.trim() || 'us-sv',
    rtcWebhookSecret: env.AGORA_RTC_WEBHOOK_SECRET?.trim() ?? '',
  };
}
