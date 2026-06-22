import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { OrderItemTypeEnum } from '../enums/commerce.enums';
import { InvoiceEntity } from './invoice.entity';

@ObjectType()
@Entity('commerce_invoice_line')
export class InvoiceLineEntity extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'invoice_id', type: 'integer' })
  @Index()
  invoiceId: number;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: InvoiceEntity;

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

  @Field(() => Int)
  @Column({ name: 'line_total_inr', type: 'integer' })
  lineTotalInr: number;
}
