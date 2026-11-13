import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentProcessingModule } from '../payment-processing/payment-processing.module';
import './enums/payment.enums';
import { PlatformFeePaymentEntity } from './entities/platform-fee-payment.entity';
import { PlatformFeeModule } from '../platform-fee/platform-fee.module';
import { CommerceModule } from '../commerce/commerce.module';
import {
  NoOpPaymentGateway,
  PaymentGatewayFactory,
} from './services/payment-gateway.factory';
import { CashfreeGateway, RazorpayGateway } from './services/payment-gateways';
import { PlatformFeePaymentService } from './services/platform-fee-payment.service';
import { PaymentResolver } from './resolvers/payment.resolver';
import { RazorpayWebhookController } from './controllers/razorpay-webhook.controller';
import { CashfreeWebhookController } from './controllers/cashfree-webhook.controller';

@Module({
  imports: [
    ConfigModule,
    PlatformFeeModule,
    forwardRef(() => CommerceModule),
    forwardRef(() => PaymentProcessingModule),
    TypeOrmModule.forFeature([PlatformFeePaymentEntity]),
  ],
  controllers: [RazorpayWebhookController, CashfreeWebhookController],
  providers: [
    NoOpPaymentGateway,
    RazorpayGateway,
    CashfreeGateway,
    PaymentGatewayFactory,
    PlatformFeePaymentService,
    PaymentResolver,
  ],
  exports: [
    PlatformFeePaymentService,
    PaymentGatewayFactory,
    RazorpayGateway,
    CashfreeGateway,
  ],
})
export class PaymentModule {}
