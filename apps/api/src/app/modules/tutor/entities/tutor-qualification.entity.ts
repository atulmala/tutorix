import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { Tutor } from './tutor.entity';
import { EducationalQualification } from '../enums/educational-qualification.enum';
import { GradeType } from '../enums/grade-type.enum';

@ObjectType()
@Entity('tutor_qualification')
export class TutorQualificationEntity extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'tutor_id', type: 'integer' })
  tutorId: number;

  @Field(() => Tutor, { nullable: true })
  @ManyToOne(() => Tutor, (tutor) => tutor.qualifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tutor_id' })
  tutor?: Tutor;

  @Field(() => EducationalQualification, {
    description: 'Educational qualification level',
  })
  @Column({
    type: 'enum',
    enum: EducationalQualification,
    name: 'qualificationType',
  })
  qualificationType: EducationalQualification;

  @Field()
  @Column({ name: 'boardOrUniversity' })
  boardOrUniversity: string;

  @Field(() => GradeType, {
    description: 'Grade type: CGPA, Percentage, or Division',
  })
  @Column({
    type: 'enum',
    enum: GradeType,
    name: 'gradeType',
  })
  gradeType: GradeType;

  @Field()
  @Column({ name: 'gradeValue' })
  gradeValue: string;

  @Field(() => Int)
  @Column({ name: 'yearObtained', type: 'smallint' })
  yearObtained: number;

  @Field({ nullable: true })
  @Column({ name: 'fieldOfStudy', nullable: true })
  fieldOfStudy?: string;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'displayOrder', type: 'smallint', default: 0 })
  displayOrder: number;
}
