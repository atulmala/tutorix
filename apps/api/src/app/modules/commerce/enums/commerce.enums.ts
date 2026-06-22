import { registerEnumType } from '@nestjs/graphql';

export enum OrderStatusEnum {
  draft = 'draft',
  pending_payment = 'pending_payment',
  paid = 'paid',
  failed = 'failed',
  cancelled = 'cancelled',
  refunded = 'refunded',
}

registerEnumType(OrderStatusEnum, { name: 'OrderStatus' });

export enum OrderPaymentMethodEnum {
  waived = 'waived',
  gateway = 'gateway',
  points = 'points',
  mixed = 'mixed',
}

registerEnumType(OrderPaymentMethodEnum, { name: 'OrderPaymentMethod' });

export enum OrderSourceEnum {
  onboarding = 'onboarding',
  cart = 'cart',
  admin = 'admin',
}

registerEnumType(OrderSourceEnum, { name: 'OrderSource' });

export enum OrderPayerRoleEnum {
  student = 'student',
  tutor = 'tutor',
}

registerEnumType(OrderPayerRoleEnum, { name: 'OrderPayerRole' });

export enum OrderItemTypeEnum {
  TUTOR_REGISTRATION = 'TUTOR_REGISTRATION',
  STUDENT_REGISTRATION = 'STUDENT_REGISTRATION',
  PROFICIENCY_TEST = 'PROFICIENCY_TEST',
  CLASS_BOOKING = 'CLASS_BOOKING',
}

registerEnumType(OrderItemTypeEnum, { name: 'OrderItemType' });

export enum OrderItemReferenceTypeEnum {
  tutor = 'tutor',
  student = 'student',
  tutor_offering = 'tutor_offering',
  class_session = 'class_session',
  calendar_slot = 'calendar_slot',
}

registerEnumType(OrderItemReferenceTypeEnum, { name: 'OrderItemReferenceType' });

export enum OrderItemFulfillmentStatusEnum {
  pending = 'pending',
  fulfilled = 'fulfilled',
  failed = 'failed',
}

registerEnumType(OrderItemFulfillmentStatusEnum, {
  name: 'OrderItemFulfillmentStatus',
});

export enum PaymentAttemptStatusEnum {
  pending = 'pending',
  paid = 'paid',
  failed = 'failed',
}

registerEnumType(PaymentAttemptStatusEnum, { name: 'PaymentAttemptStatus' });
