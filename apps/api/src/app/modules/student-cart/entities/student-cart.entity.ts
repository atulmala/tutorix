import { Column, Entity, Index, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { Student } from '../../student/entities/student.entity';
import { StudentCartItemEntity } from './student-cart-item.entity';

@Entity('student_cart')
export class StudentCartEntity extends QBaseEntity {
  @Column({ name: 'student_id', type: 'integer', unique: true })
  @Index()
  studentId!: number;

  @OneToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: Student;

  @OneToMany(() => StudentCartItemEntity, (item) => item.cart)
  items?: StudentCartItemEntity[];
}
