import { registerEnumType } from '@nestjs/graphql';

export enum OtpPurpose {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  MOBILE_VERIFICATION = 'MOBILE_VERIFICATION',
  WHATSAPP_VERIFICATION = 'WHATSAPP_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  OTHER = 'OTHER',
}

registerEnumType(OtpPurpose, {
  name: 'OtpPurpose',
  description: 'Tasks for which one-time passwords are issued',
});

