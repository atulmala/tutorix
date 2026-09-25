import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { StudentCartEntity } from './student-cart.entity';

@Entity('student_cart_item')
@Unique('UQ_student_cart_item_offering_mode', [
  'cartId',
  'tutorOfferingId',
  'deliveryMode',
])
export class StudentCartItemEntity extends QBaseEntity {
  @Column({ name: 'cart_id', type: 'integer' })
  @Index()
  cartId!: number;

  @ManyToOne(() => StudentCartEntity, (cart) => cart.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cart_id' })
  cart?: StudentCartEntity;

  @Column({ name: 'tutor_offering_id', type: 'integer' })
  @Index()
  tutorOfferingId!: number;

  @ManyToOne(() => TutorOfferingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_offering_id' })
  tutorOffering?: TutorOfferingEntity;

  @Column({
    name: 'delivery_mode',
    type: 'enum',
    enum: ClassSessionDeliveryModeEnum,
  })
  deliveryMode!: ClassSessionDeliveryModeEnum;

  @Column({ type: 'smallint' })
  quantity!: number;

  @Column({ name: 'unit_rate_inr', type: 'integer' })
  unitRateInr!: number;
}
