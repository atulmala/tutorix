import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { AddressType } from '../enums/address-type.enum';
import { Tutor } from '../../tutor/entities/tutor.entity';

@ObjectType()
@Entity('address')
/*
CREATE INDEX IF NOT EXISTS address_city_lower_idx ON serviceAddress (lower(city));
CREATE INDEX IF NOT EXISTS address_state_lower_idx ON serviceAddress (lower(state));
CREATE INDEX IF NOT EXISTS address_country_lower_idx ON serviceAddress (lower(country));
 */
@Index('address_city_lower_idx', { synchronize: false })
@Index('address_state_lower_idx', { synchronize: false })
@Index('address_country_lower_idx', { synchronize: false })
export class AddressEntity extends QBaseEntity {
  @Field(() => AddressType, { nullable: true })
  @Column('enum', { enum: AddressType, default: AddressType.HOME })
  type: AddressType;

  @Field({ nullable: true })
  @Column({ nullable: true })
  street: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  subArea: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  city: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  state: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  country: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  landmark: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  @Index()
  postalCode: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  fullAddress: string;

  @Field({ nullable: true })
  @Column({ type: 'decimal', precision: 12, scale: 8, default: 0 })
  latitude: number;

  @Field({ nullable: true })
  @Column({ type: 'decimal', precision: 12, scale: 8, default: 0 })
  longitude: number;

  @Field()
  @Column({ default: false })
  verified: boolean;

  @Field()
  @Column({ default: false })
  primary: boolean;

  @Field(() => Tutor, { nullable: true })
  @ManyToOne(() => Tutor, (tutor) => tutor.addresses, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'tutor_id' })
  tutor?: Tutor;
}
