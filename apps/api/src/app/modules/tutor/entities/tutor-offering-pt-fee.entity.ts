import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { TutorOfferingPtFeeStatusEnum } from '../enums/tutor-offering-pt-fee-status.enum';
import { TutorOfferingEntity } from './tutor-offering.entity';

@Entity('tutor_offering_pt_fee')
export class TutorOfferingPtFeeEntity extends QBaseEntity {
  @Column({ name: 'tutor_offering_id', unique: true })
  @Index()
  tutorOfferingId: number;

  @OneToOne(() => TutorOfferingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_offering_id' })
  tutorOffering?: TutorOfferingEntity;

  @Column({ name: 'list_price_inr', type: 'smallint', default: 99 })
  listPriceInr: number;

  @Column({ name: 'amount_due_inr', type: 'smallint', default: 0 })
  amountDueInr: number;

  @Column({
    type: 'enum',
    enum: TutorOfferingPtFeeStatusEnum,
    name: 'payment_status',
    default: TutorOfferingPtFeeStatusEnum.waived,
  })
  paymentStatus: TutorOfferingPtFeeStatusEnum;

  @Column({ name: 'gateway_order_id', type: 'varchar', nullable: true })
  gatewayOrderId?: string | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date | null;
}
