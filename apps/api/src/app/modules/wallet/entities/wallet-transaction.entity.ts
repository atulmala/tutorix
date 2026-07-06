import { Column, Entity, Index } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { WalletTransactionTypeEnum } from '../enums/wallet.enums';

@ObjectType()
@Entity('wallet_transaction')
export class WalletTransactionEntity extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'wallet_id', type: 'integer' })
  @Index()
  walletId: number;

  @Field(() => Int)
  @Column({ name: 'user_id', type: 'integer' })
  @Index()
  userId: number;

  @Field(() => WalletTransactionTypeEnum)
  @Column({
    type: 'enum',
    enum: WalletTransactionTypeEnum,
  })
  type: WalletTransactionTypeEnum;

  @Field(() => Int)
  @Column({ name: 'amount_inr', type: 'integer' })
  amountInr: number;

  @Field(() => Int)
  @Column({ name: 'balance_after_inr', type: 'integer' })
  balanceAfterInr: number;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'commerce_order_id', type: 'integer', nullable: true })
  commerceOrderId?: number;

  @Field({ nullable: true })
  @Column({ name: 'reference_type', type: 'varchar', length: 32, nullable: true })
  referenceType?: string;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'reference_id', type: 'integer', nullable: true })
  referenceId?: number;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  description: string;
}
