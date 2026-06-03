import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';

@Entity('tutor_offering_rate_card')
export class TutorOfferingRateCardEntity extends QBaseEntity {
  @Column({ name: 'tutor_offering_id', unique: true })
  @Index()
  tutorOfferingId: number;

  @Column({ name: 'free_demo_offered', default: false })
  freeDemoOffered: boolean;

  @Column({ name: 'offline_enabled', default: true })
  offlineEnabled: boolean;

  @Column({ name: 'offline_base_rate', type: 'integer', nullable: true })
  offlineBaseRate?: number | null;

  @Column({ name: 'offline_base_discount_pct', type: 'smallint', default: 0 })
  offlineBaseDiscountPct: number;

  @Column({ name: 'offline_slab2_discount_pct', type: 'smallint', nullable: true })
  offlineSlab2DiscountPct?: number | null;

  @Column({ name: 'offline_slab3_discount_pct', type: 'smallint', nullable: true })
  offlineSlab3DiscountPct?: number | null;

  @Column({ name: 'online_enabled', default: false })
  onlineEnabled: boolean;

  @Column({ name: 'online_base_rate', type: 'integer', nullable: true })
  onlineBaseRate?: number | null;

  @Column({ name: 'online_base_discount_pct', type: 'smallint', default: 0 })
  onlineBaseDiscountPct: number;

  @Column({ name: 'online_slab2_discount_pct', type: 'smallint', nullable: true })
  onlineSlab2DiscountPct?: number | null;

  @Column({ name: 'online_slab3_discount_pct', type: 'smallint', nullable: true })
  onlineSlab3DiscountPct?: number | null;

  @Column({ name: 'offline_batch_size', type: 'smallint', default: 1 })
  offlineBatchSize: number;

  @Column({ name: 'online_batch_size', type: 'smallint', default: 1 })
  onlineBatchSize: number;

  @OneToOne(() => TutorOfferingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_offering_id' })
  tutorOffering?: TutorOfferingEntity;
}
