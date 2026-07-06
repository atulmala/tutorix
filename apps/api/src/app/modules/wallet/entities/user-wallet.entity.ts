import { Column, Entity, Index, Unique } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';

@ObjectType()
@Entity('user_wallet')
@Unique('UQ_user_wallet_user_id', ['userId'])
export class UserWalletEntity extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'user_id', type: 'integer' })
  @Index()
  userId: number;

  @Field(() => Int)
  @Column({ name: 'balance_inr', type: 'integer', default: 0 })
  balanceInr: number;
}
