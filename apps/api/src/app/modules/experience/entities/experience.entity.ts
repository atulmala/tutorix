import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { DocumentEntity } from '../../document/entities/document.entity';
import { EmploymentType } from '../enums/employment-type.enum';

/**
 * Converts PostgreSQL date strings (YYYY-MM-DD) to Date objects when reading.
 * GraphQL DateTime scalar expects Date/ISO string; raw date-only strings cause serialization errors.
 */
const dateColumnTransformer = {
  from: (value: string | Date | null | undefined): Date | null =>
    value ? new Date(value as string) : null,
  to: (value: Date | null | undefined): Date | string | null =>
    value instanceof Date ? value : value ?? null,
};

@ObjectType()
@Entity('tutor_experience')
export class ExperienceEntity extends QBaseEntity {
  @Field(() => Tutor)
  @ManyToOne(() => Tutor, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tutor_id' })
  tutor: Tutor;

  @Field({ description: 'Job title' })
  @Column({ name: 'job_title' })
  jobTitle: string;

  @Field({ nullable: true, description: 'Employer name (not required if self-employed)' })
  @Column({ name: 'employer_name', nullable: true })
  employerName?: string;

  @Field({ nullable: true, description: 'Employer address (text, not required if self-employed)' })
  @Column({ name: 'employer_address', type: 'text', nullable: true })
  employerAddress?: string;

  @Field(() => EmploymentType, { description: 'Type of employment' })
  @Column({
    type: 'smallint',
    name: 'employment_type',
  })
  employmentType: EmploymentType;

  @Field({ description: 'Start date' })
  @Column({
    name: 'start_date',
    type: 'date',
    transformer: dateColumnTransformer,
  })
  startDate: Date;

  @Field({ nullable: true, description: 'End date (not required if currently working)' })
  @Column({
    name: 'end_date',
    type: 'date',
    nullable: true,
    transformer: dateColumnTransformer,
  })
  endDate?: Date;

  @Field({
    description: 'Whether currently working here (if true, end date not required)',
  })
  @Column({ name: 'is_current', default: false })
  isCurrent: boolean;

  @Field(() => [DocumentEntity], {
    nullable: true,
    description: 'Documents associated with this experience',
  })
  @OneToMany(() => DocumentEntity, (doc) => doc.experience)
  documents?: DocumentEntity[];
}
