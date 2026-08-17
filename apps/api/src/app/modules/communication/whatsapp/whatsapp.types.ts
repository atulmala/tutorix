export type SendWhatsAppInput = {
  to: string;
  body: string;
  userId?: number | null;
};

export type SendWhatsAppResult = {
  success: boolean;
  messageId: string | null;
};
