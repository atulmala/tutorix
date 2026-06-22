import { Column, Entity, Index, OneToMany, Unique } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { OrderPaymentMethodEnum } from '../enums/commerce.enums';
import { InvoiceLineEntity } from './invoice-line.entity';

@ObjectType()
@Entity('commerce_invoice')
@Unique('UQ_commerce_invoice_invoice_number', ['invoiceNumber'])
export class InvoiceEntity extends QBaseEntity {
  @Field()
  @Column({ name: 'invoice_number', type: 'varchar', length: 32 })
  invoiceNumber: string;

  @Field(() => Int)
  @Column({ name: 'order_id', type: 'integer' })
  @Index()
  orderId: number;

  @Field()
  @Column({ name: 'order_number', type: 'varchar', length: 32 })
  orderNumber: string;

  @Field(() => Int)
  @Column({ name: 'user_id', type: 'integer' })
  @Index()
  userId: number;

  @Field(() => Int)
  @Column({ name: 'subtotal_inr', type: 'integer' })
  subtotalInr: number;

  @Field(() => Int)
  @Column({ name: 'discount_inr', type: 'integer' })
  discountInr: number;

  @Field(() => Int)
  @Column({ name: 'tax_inr', type: 'integer' })
  taxInr: number;

  @Field(() => Int)
  @Column({ name: 'points_value_inr', type: 'integer', default: 0 })
  pointsValueInr: number;

  @Field(() => Int)
  @Column({ name: 'amount_due_inr', type: 'integer' })
  amountDueInr: number;

  @Field(() => Int)
  @Column({ name: 'amount_paid_inr', type: 'integer' })
  amountPaidInr: number;

  @Field(() => OrderPaymentMethodEnum)
  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: OrderPaymentMethodEnum,
  })
  paymentMethod: OrderPaymentMethodEnum;

  @Field()
  @Column({ name: 'issued_at', type: 'timestamp' })
  issuedAt: Date;

  @Field({ nullable: true })
  @Column({ name: 'pdf_storage_key', type: 'varchar', nullable: true })
  pdfStorageKey?: string;

  @OneToMany(() => InvoiceLineEntity, (line) => line.invoice)
  lines?: InvoiceLineEntity[];
}
