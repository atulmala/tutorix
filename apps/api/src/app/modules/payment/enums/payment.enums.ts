import { registerEnumType } from '@nestjs/graphql';

export enum PaymentGatewayProviderEnum {
  razorpay = 'razorpay',
  cashfree = 'cashfree',
}

registerEnumType(PaymentGatewayProviderEnum, {
  name: 'PaymentGatewayProvider',
});

export enum PlatformFeePaymentStatusEnum {
  waived = 'waived',
  pending = 'pending',
  paid = 'paid',
  failed = 'failed',
}

registerEnumType(PlatformFeePaymentStatusEnum, {
  name: 'PlatformFeePaymentStatus',
});

export enum PlatformFeePaymentContextTypeEnum {
  tutor = 'tutor',
  student = 'student',
  tutor_offering = 'tutor_offering',
}

registerEnumType(PlatformFeePaymentContextTypeEnum, {
  name: 'PlatformFeePaymentContextType',
});
