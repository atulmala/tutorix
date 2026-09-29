import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { Student } from '../../student/entities/student.entity';
import { ClassCreditRefundMethodEnum } from '../enums/class-credit-refund-method.enum';
import { StudentClassCreditEntity } from './student-class-credit.entity';

@Entity('class_credit_cancellation')
@Unique('UQ_class_credit_cancellation_credit_id', ['creditId'])
export class ClassCreditCancellationEntity extends QBaseEntity {
  @Column({ name: 'credit_id', type: 'integer' })
  creditId!: number;

  @ManyToOne(() => StudentClassCreditEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'credit_id' })
  credit?: StudentClassCreditEntity;

  @Column({ name: 'student_id', type: 'integer' })
  studentId!: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: Student;

  @Column({ name: 'user_id', type: 'integer' })
  @Index()
  userId!: number;

  @Column({ name: 'amount_inr', type: 'integer' })
  amountInr!: number;

  @Column({
    name: 'refund_method',
    type: 'enum',
    enum: ClassCreditRefundMethodEnum,
  })
  refundMethod!: ClassCreditRefundMethodEnum;
}
