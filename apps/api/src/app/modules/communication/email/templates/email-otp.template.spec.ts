import { buildEmailOtpMessage } from './email-otp.template';

describe('buildEmailOtpMessage', () => {
  it('includes the OTP and expiry, and escapes the name', () => {
    const message = buildEmailOtpMessage({
      firstName: '<script>xss</script>',
      otp: '123456',
    });
    expect(message.subject).toBe('Your Tutorix verification code');
    expect(message.text).toContain('123456');
    expect(message.text).toContain('30 minutes');
    expect(message.html).toContain('123456');
    expect(message.html).toContain('&lt;script&gt;xss&lt;/script&gt;');
    expect(message.html).not.toContain('<script>xss</script>');
  });

  it('falls back to a generic greeting', () => {
    const message = buildEmailOtpMessage({ otp: '000111' });
    expect(message.text).toContain('Hi there');
  });
});
