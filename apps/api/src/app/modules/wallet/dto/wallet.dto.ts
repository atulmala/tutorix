import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserWalletDto {
  @Field(() => Int)
  balanceInr: number;
}

@ObjectType()
export class WalletTransactionDto {
  @Field(() => Int)
  id: number;

  @Field()
  createdDate: Date;

  @Field()
  type: string;

  @Field(() => Int)
  amountInr: number;

  @Field(() => Int)
  balanceAfterInr: number;

  @Field()
  description: string;

  @Field(() => Int, { nullable: true })
  commerceOrderId?: number;
}

@ObjectType()
export class WalletTransactionConnectionDto {
  @Field(() => [WalletTransactionDto])
  items: WalletTransactionDto[];

  @Field()
  hasMore: boolean;
}
