export type SendNotificationInput = {
  userId?: number | null;
  title: string;
  body: string;
  data?: Record<string, string>;
};

export type SendNotificationResult = {
  success: boolean;
  messageId: string | null;
};
