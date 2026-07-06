import { Field, InputType, Int } from '@nestjs/graphql';
import {
  WalletPurchaseItemTypeEnum,
  WalletPurchaseReferenceTypeEnum,
} from '../enums/wallet.enums';

@InputType()
export class WalletPurchaseIntentInput {
  @Field(() => WalletPurchaseItemTypeEnum)
  itemType: WalletPurchaseItemTypeEnum;

  @Field(() => WalletPurchaseReferenceTypeEnum)
  referenceType: WalletPurchaseReferenceTypeEnum;

  @Field(() => Int)
  referenceId: number;
}

@InputType()
export class WalletPurchasePreviewInput {
  @Field(() => WalletPurchaseIntentInput)
  purchaseIntent: WalletPurchaseIntentInput;
}

@InputType()
export class WalletTopUpInput {
  @Field(() => Int)
  amountInr: number;

  @Field(() => WalletPurchaseIntentInput, { nullable: true })
  purchaseIntent?: WalletPurchaseIntentInput;
}

@InputType()
export class ConfirmWalletTopUpInput {
  @Field()
  provider: string;

  @Field()
  orderId: string;

  @Field({ nullable: true })
  paymentId?: string;

  @Field({ nullable: true })
  signature?: string;

  @Field({ nullable: true })
  fetchFromGateway?: boolean;

  @Field(() => WalletPurchaseIntentInput, { nullable: true })
  purchaseIntent?: WalletPurchaseIntentInput;
}
