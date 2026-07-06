import { Field, Int, ObjectType } from '@nestjs/graphql';
import { UserWalletDto } from './wallet.dto';

@ObjectType()
export class WalletPurchasePreviewDto {
  @Field(() => Int)
  purchaseAmountInr: number;

  @Field(() => Int)
  walletBalanceInr: number;

  @Field(() => Int)
  shortfallInr: number;

  @Field()
  canPayFromWallet: boolean;

  @Field()
  purchaseDescription: string;
}

@ObjectType()
export class WalletPurchaseResultDto {
  @Field(() => UserWalletDto)
  wallet: UserWalletDto;

  @Field(() => Int)
  orderId: number;

  @Field()
  orderNumber: string;
}

@ObjectType()
export class WalletTopUpResultDto {
  @Field(() => UserWalletDto)
  wallet: UserWalletDto;

  @Field(() => Int, { nullable: true })
  purchaseOrderId?: number;

  @Field({ nullable: true })
  purchaseOrderNumber?: string;
}
