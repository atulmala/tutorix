import { ConfigService } from '@nestjs/config';
import { renderTemplate } from '../../template.renderer';
import { TemplateStore } from '../../template.store';

describe('EMAIL_VERIFICATION email template', () => {
  const store = new TemplateStore({
    get: () => undefined,
  } as unknown as ConfigService);

  it('includes the OTP and expiry, and escapes the name', () => {
    const file = store.read('email/EMAIL_VERIFICATION.ACTOR.html');
    const html = renderTemplate(file.body, {
      firstName: '<script>xss</script>',
      otp: '123456',
      expiryMinutes: '30',
    }, { htmlEscape: true });
    const text = renderTemplate(
      file.attributes.text ?? '',
      { firstName: 'Ada', otp: '123456', expiryMinutes: '30' },
    );
    expect(file.attributes.subject).toBe('Your Tutorix verification code');
    expect(text).toContain('123456');
    expect(text).toContain('30 minutes');
    expect(html).toContain('123456');
    expect(html).toContain('&lt;script&gt;xss&lt;/script&gt;');
    expect(html).not.toContain('<script>xss</script>');
  });

  it('falls back to a generic greeting when firstName is there', () => {
    const file = store.read('email/EMAIL_VERIFICATION.ACTOR.html');
    const text = renderTemplate(file.attributes.text ?? '', {
      firstName: 'there',
      otp: '000111',
      expiryMinutes: '30',
    });
    expect(text).toContain('Hi there');
  });
});
