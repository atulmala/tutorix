import { Field, InputType } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const IFSC_PATTERN = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;
const GST_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_INPUT_PATTERN = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/;

@InputType()
export class SaveUserBankDetailsInput {
  @Field()
  @IsString()
  @MaxLength(120)
  bankName: string;

  @Field()
  @IsString()
  @Matches(/^\d{9,18}$/, {
    message: 'Account number must be 9 to 18 digits',
  })
  accountNumber: string;

  @Field()
  @IsString()
  @Matches(IFSC_PATTERN, {
    message: 'IFSC code must be in valid format (e.g. HDFC0001234)',
  })
  ifscCode: string;

  @Field()
  @IsString()
  @Matches(PAN_INPUT_PATTERN, {
    message: 'PAN must be a valid 10-character PAN (e.g. ABCDE1234F)',
  })
  panNumber: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value != null && String(value).trim() !== '')
  @IsString()
  @Matches(GST_PATTERN, {
    message: 'GST number must be a valid 15-character GSTIN',
  })
  gstNumber?: string | null;
}
