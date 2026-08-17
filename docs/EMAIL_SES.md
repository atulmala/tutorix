# Email (AWS SES)

Tutorix sends transactional email through a NestJS `EmailModule` (under `communication/`) backed by AWS SES. First uses: signup email OTP and an admin test-send page. Push notifications will live in the sibling `notification/` channel (Firebase Cloud Messaging); Analytics/Crashlytics stay in `libs/common/analytics`.

## Environment

Set these on the API (root `.env` for local Nx, or Compose env on EC2):

```text
EMAIL_PROVIDER=ses
SES_FROM_EMAIL=info@tutorix.tech
SES_FROM_NAME=Tutorix
SES_REGION=us-east-1
```

`SES_REGION` must match the region where the SES identity was verified. If unset, the API falls back to `AWS_REGION` / `AWS_DEFAULT_REGION`, then `us-east-1`.

`EMAIL_PROVIDER`:

- `ses` — send via AWS SESv2
- `console` — log to the API logger (no AWS call). Useful for local signup without SES.
- unset — uses `ses` when `SES_FROM_EMAIL` is set, otherwise `console`

In `NODE_ENV=production`, console fallback is rejected. Configure SES or email OTP / admin send will fail.

Credentials use the same chain as S3: EC2 instance profile preferred; `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` locally if needed. The identity used for sending is `info@tutorix.tech` in `us-east-1`.

## IAM

The API role or user needs `ses:SendEmail` in `us-east-1` for `info@tutorix.tech`. Example:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail"],
      "Resource": "*"
    }
  ]
}
```

Narrow `Resource` to the verified identity ARN when you have it.

## Sandbox / production

This account has production sending access in `us-east-1`. You can send to any valid recipient. The from identity (`info@tutorix.tech`) must still be verified.


## How to test

1. Set the env vars above and restart the API.
2. Sign in to the admin app and open **Email**.
3. Confirm provider `ses`, from `info@tutorix.tech`, region `us-east-1`.
4. Send to a recipient address. Success shows an SES Message ID.
5. Signup email OTP uses the same send path. The GraphQL `generateOtp` response omits the code when SES is the provider.

## Send log

Every `EmailService.send()` attempt writes a metadata row to `email_send` (`purpose`, recipient, subject, provider, SES `MessageId`, `SENT` or `FAILED`). The body and OTP are not stored. Bounce/complaint status is not updated yet.


Local without SES: `EMAIL_PROVIDER=console`. Admin send reports that the message was logged; email OTP is also returned in the GraphQL response so signup can continue.
