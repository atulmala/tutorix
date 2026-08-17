export type SendSmsInput = {
  to: string;
  body: string;
  userId?: number | null;
};

export type SendSmsResult = {
  success: boolean;
  messageId: string | null;
};
