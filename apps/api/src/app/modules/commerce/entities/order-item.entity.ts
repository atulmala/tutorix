import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import {
  OrderItemFulfillmentStatusEnum,
  OrderItemReferenceTypeEnum,
  OrderItemTypeEnum,
} from '../enums/commerce.enums';
import { OrderEntity } from './order.entity';

@ObjectType()
@Entity('commerce_order_item')
export class OrderItemEntity extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'order_id', type: 'integer' })
  @Index()
  orderId: number;

  @ManyToOne(() => OrderEntity, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: OrderEntity;

  @Field(() => OrderItemTypeEnum)
  @Column({
    name: 'item_type',
    type: 'enum',
    enum: OrderItemTypeEnum,
  })
  itemType: OrderItemTypeEnum;

  @Field()
  @Column({ type: 'text' })
  description: string;

  @Field(() => Int)
  @Column({ type: 'smallint', default: 1 })
  quantity: number;

  @Field(() => Int)
  @Column({ name: 'unit_rate_inr', type: 'integer' })
  unitRateInr: number;

  @Field(() => Int)
  @Column({ name: 'line_subtotal_inr', type: 'integer' })
  lineSubtotalInr: number;

  @Field(() => Int)
  @Column({ name: 'discount_inr', type: 'integer', default: 0 })
  discountInr: number;

  @Field()
  @Column({ name: 'waiver_applied', type: 'boolean', default: false })
  waiverApplied: boolean;

  @Field(() => Int)
  @Column({ name: 'cgst_inr', type: 'integer', default: 0 })
  cgstInr: number;

  @Field(() => Int)
  @Column({ name: 'sgst_inr', type: 'integer', default: 0 })
  sgstInr: number;

  @Field(() => Int)
  @Column({ name: 'igst_inr', type: 'integer', default: 0 })
  igstInr: number;

  @Field(() => Float)
  @Column({
    name: 'gst_rate_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  gstRatePercent: number;

  @Field(() => OrderItemReferenceTypeEnum)
  @Column({
    name: 'reference_type',
    type: 'enum',
    enum: OrderItemReferenceTypeEnum,
  })
  referenceType: OrderItemReferenceTypeEnum;

  @Field(() => Int)
  @Column({ name: 'reference_id', type: 'integer' })
  @Index()
  referenceId: number;

  @Field(() => OrderItemFulfillmentStatusEnum)
  @Column({
    name: 'fulfillment_status',
    type: 'enum',
    enum: OrderItemFulfillmentStatusEnum,
    default: OrderItemFulfillmentStatusEnum.pending,
  })
  fulfillmentStatus: OrderItemFulfillmentStatusEnum;
}
