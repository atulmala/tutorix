import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('user_bank_details')
export class UserBankDetailsEntity extends QBaseEntity {
  @Column({ name: 'user_id', unique: true })
  @Index()
  userId: number;

  @Column({ name: 'bank_name' })
  bankName: string;

  @Column({ name: 'account_number' })
  accountNumber: string;

  @Column({ name: 'ifsc_code', length: 11 })
  ifscCode: string;

  @Column({ name: 'gst_number', type: 'varchar', nullable: true })
  gstNumber?: string | null;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
