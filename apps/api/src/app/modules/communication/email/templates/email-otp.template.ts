import { escapeHtml } from '../email.utils';

const OTP_EXPIRY_MINUTES = 30;

export function buildEmailOtpMessage(input: {
  firstName?: string | null;
  otp: string;
}): { subject: string; html: string; text: string } {
  const greetingName = input.firstName?.trim() || 'there';
  const subject = 'Your Tutorix verification code';
  const text = [
    `Hi ${greetingName},`,
    '',
    `Your Tutorix email verification code is: ${input.otp}`,
    '',
    `This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email.`,
    '',
    '— Tutorix',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.5;">
    <p>Hi ${escapeHtml(greetingName)},</p>
    <p>Your Tutorix email verification code is:</p>
    <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700; margin: 16px 0;">${escapeHtml(input.otp)}</p>
    <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>
    <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">— Tutorix</p>
  </body>
</html>`;

  return { subject, html, text };
}
