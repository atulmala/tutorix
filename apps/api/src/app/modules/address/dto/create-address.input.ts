import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsString, IsNumber, IsInt, IsEnum } from 'class-validator';
import { AddressType } from '../enums/address-type.enum';

@InputType()
export class CreateAddressInput {
  @Field(() => AddressType, { nullable: true })
  @IsOptional()
  @IsEnum(AddressType)
  type?: AddressType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  street?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  subArea?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  city?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  state?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  country?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  landmark?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  postalCode?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  fullAddress?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
