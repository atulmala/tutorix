import { registerEnumType } from '@nestjs/graphql';

export enum WalletTransactionTypeEnum {
  top_up_credit = 'top_up_credit',
  purchase_debit = 'purchase_debit',
}

registerEnumType(WalletTransactionTypeEnum, { name: 'WalletTransactionType' });

export enum WalletPurchaseItemTypeEnum {
  PROFICIENCY_TEST = 'PROFICIENCY_TEST',
  CLASS_BOOKING = 'CLASS_BOOKING',
}

registerEnumType(WalletPurchaseItemTypeEnum, { name: 'WalletPurchaseItemType' });

export enum WalletPurchaseReferenceTypeEnum {
  tutor_offering = 'tutor_offering',
  class_session = 'class_session',
}

registerEnumType(WalletPurchaseReferenceTypeEnum, {
  name: 'WalletPurchaseReferenceType',
});
