import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { OrderEntity } from '../../commerce/entities/order.entity';
import { OrderItemEntity } from '../../commerce/entities/order-item.entity';
import { Student } from '../../student/entities/student.entity';
import { TutorClassSessionEnrollmentEntity } from '../../tutor-class-session/entities/tutor-class-session-enrollment.entity';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { ClassCreditStatusEnum } from '../enums/class-credit-status.enum';

@Entity('student_class_credit')
export class StudentClassCreditEntity extends QBaseEntity {
  @Column({ name: 'student_id', type: 'integer' })
  @Index()
  studentId!: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: Student;

  @Column({ name: 'order_id', type: 'integer' })
  @Index()
  orderId!: number;

  @ManyToOne(() => OrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: OrderEntity;

  @Column({ name: 'order_item_id', type: 'integer' })
  @Index()
  orderItemId!: number;

  @ManyToOne(() => OrderItemEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_item_id' })
  orderItem?: OrderItemEntity;

  @Column({ name: 'tutor_id', type: 'integer' })
  @Index()
  tutorId!: number;

  @ManyToOne(() => Tutor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_id' })
  tutor?: Tutor;

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

  @Column({
    type: 'enum',
    enum: ClassCreditStatusEnum,
    default: ClassCreditStatusEnum.unscheduled,
  })
  @Index()
  status!: ClassCreditStatusEnum;

  @Column({ name: 'enrollment_id', type: 'integer', nullable: true })
  enrollmentId?: number | null;

  @ManyToOne(() => TutorClassSessionEnrollmentEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment?: TutorClassSessionEnrollmentEntity | null;
}
