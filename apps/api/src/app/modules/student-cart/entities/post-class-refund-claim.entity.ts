import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { Student } from '../../student/entities/student.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { ClassCancellationRefundRequestEntity } from './class-cancellation-refund-request.entity';
import { PostClassRefundAdminStatusEnum } from '../enums/post-class-refund-admin-status.enum';
import { PostClassRefundClaimMethodEnum } from '../enums/post-class-refund-claim-method.enum';
import { PostClassRefundClaimReasonEnum } from '../enums/post-class-refund-claim-reason.enum';
import { PostClassRefundTutorResponseStatusEnum } from '../enums/post-class-refund-tutor-response-status.enum';

@ObjectType()
@Entity('post_class_refund_claim')
export class PostClassRefundClaimEntity extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'enrollment_id', type: 'integer' })
  @Index()
  enrollmentId!: number;

  @Field(() => Int)
  @Column({ name: 'class_credit_id', type: 'integer' })
  classCreditId!: number;

  @Field(() => Int)
  @Column({ name: 'student_id', type: 'integer' })
  @Index()
  studentId!: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: Student;

  @Field(() => Int)
  @Column({ name: 'tutor_id', type: 'integer' })
  @Index()
  tutorId!: number;

  @ManyToOne(() => Tutor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_id' })
  tutor?: Tutor;

  @Field(() => Int)
  @Column({ name: 'tutor_offering_id', type: 'integer' })
  tutorOfferingId!: number;

  @ManyToOne(() => TutorOfferingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_offering_id' })
  tutorOffering?: TutorOfferingEntity;

  @Field(() => Int)
  @Column({ name: 'order_item_id', type: 'integer' })
  orderItemId!: number;

  @Field()
  @Column({ name: 'class_starts_at', type: 'timestamp' })
  classStartsAt!: Date;

  @Field(() => Int)
  @Column({ name: 'duration_minutes', type: 'integer' })
  durationMinutes!: number;

  @Field(() => ClassSessionDeliveryModeEnum)
  @Column({
    name: 'delivery_mode',
    type: 'enum',
    enum: ClassSessionDeliveryModeEnum,
    enumName: 'tutor_class_session_delivery_mode_enum',
  })
  deliveryMode!: ClassSessionDeliveryModeEnum;

  @Field()
  @Column({ name: 'offering_label', type: 'varchar', length: 512 })
  offeringLabel!: string;

  @Field(() => PostClassRefundClaimReasonEnum)
  @Column({
    name: 'reason',
    type: 'enum',
    enum: PostClassRefundClaimReasonEnum,
    enumName: 'post_class_refund_claim_reason_enum',
  })
  reason!: PostClassRefundClaimReasonEnum;

  @Field(() => PostClassRefundClaimMethodEnum)
  @Column({
    name: 'refund_method',
    type: 'enum',
    enum: PostClassRefundClaimMethodEnum,
    enumName: 'post_class_refund_claim_method_enum',
  })
  refundMethod!: PostClassRefundClaimMethodEnum;

  @Field(() => Int)
  @Column({ name: 'preview_amount_inr', type: 'integer', default: 0 })
  previewAmountInr!: number;

  @Column({ name: 'refund_breakdown_json', type: 'jsonb', nullable: true })
  refundBreakdownJson?: Record<string, unknown> | null;

  @Field(() => PostClassRefundTutorResponseStatusEnum)
  @Column({
    name: 'tutor_response_status',
    type: 'enum',
    enum: PostClassRefundTutorResponseStatusEnum,
    enumName: 'post_class_refund_tutor_response_status_enum',
    default: PostClassRefundTutorResponseStatusEnum.pending,
  })
  tutorResponseStatus!: PostClassRefundTutorResponseStatusEnum;

  @Field(() => String, { nullable: true })
  @Column({ name: 'tutor_decline_comment', type: 'text', nullable: true })
  tutorDeclineComment?: string | null;

  @Field(() => Date, { nullable: true })
  @Column({ name: 'tutor_responded_at', type: 'timestamp', nullable: true })
  tutorRespondedAt?: Date | null;

  @Field(() => PostClassRefundAdminStatusEnum)
  @Column({
    name: 'admin_status',
    type: 'enum',
    enum: PostClassRefundAdminStatusEnum,
    enumName: 'post_class_refund_admin_status_enum',
    default: PostClassRefundAdminStatusEnum.pending,
  })
  adminStatus!: PostClassRefundAdminStatusEnum;

  @Field(() => String, { nullable: true })
  @Column({ name: 'admin_comment', type: 'text', nullable: true })
  adminComment?: string | null;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'processed_by_user_id', type: 'integer', nullable: true })
  processedByUserId?: number | null;

  @Field(() => Date, { nullable: true })
  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt?: Date | null;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'cancellation_refund_request_id', type: 'integer', nullable: true })
  cancellationRefundRequestId?: number | null;

  @ManyToOne(() => ClassCancellationRefundRequestEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'cancellation_refund_request_id' })
  cancellationRefundRequest?: ClassCancellationRefundRequestEntity | null;

  @Field(() => Date, { nullable: true })
  @Column({ name: 'fulfilled_at', type: 'timestamp', nullable: true })
  fulfilledAt?: Date | null;

  @Field(() => Date)
  @Column({ name: 'tutor_response_deadline_at', type: 'timestamp' })
  tutorResponseDeadlineAt!: Date;

  @Field(() => Date)
  @Column({ name: 'submitted_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt!: Date;

  @Field(() => Int)
  @Column({ name: 'submitted_by_user_id', type: 'integer' })
  submittedByUserId!: number;
}
