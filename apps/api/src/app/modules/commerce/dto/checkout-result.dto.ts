import { Field, ObjectType } from '@nestjs/graphql';
import { PaymentOrderSessionDto } from '../../payment/dto/payment-order-session.dto';
import { CommerceOrderDto } from './commerce-order.dto';

@ObjectType()
export class CheckoutResultDto {
  @Field(() => CommerceOrderDto)
  order: CommerceOrderDto;

  @Field(() => PaymentOrderSessionDto, { nullable: true })
  session?: PaymentOrderSessionDto;
}
