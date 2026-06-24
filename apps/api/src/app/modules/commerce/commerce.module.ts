import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import './enums/commerce.enums';
import { BatchJobAuditModule } from '../../batch-jobs/batch-job-audit.module';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { PaymentAttemptEntity } from './entities/payment-attempt.entity';
import { InvoiceEntity } from './entities/invoice.entity';
import { InvoiceLineEntity } from './entities/invoice-line.entity';
import { PlatformFeeModule } from '../platform-fee/platform-fee.module';
import { PaymentModule } from '../payment/payment.module';
import { User } from '../auth/entities/user.entity';
import { Student } from '../student/entities/student.entity';
import { Tutor } from '../tutor/entities/tutor.entity';
import { CheckoutService } from './services/checkout.service';
import { OrderService } from './services/order.service';
import { OrderPricingService } from './services/order-pricing.service';
import { OrderFulfillmentService } from './services/order-fulfillment.service';
import { InvoiceService } from './services/invoice.service';
import { CommerceAdminService } from './services/commerce-admin.service';
import { PaymentSettlementBatchService } from './services/payment-settlement-batch.service';
import { CommerceResolver } from './resolvers/commerce.resolver';

@Module({
  imports: [
    ConfigModule,
    BatchJobAuditModule,
    PlatformFeeModule,
    forwardRef(() => PaymentModule),
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      PaymentAttemptEntity,
      InvoiceEntity,
      InvoiceLineEntity,
      User,
      Student,
      Tutor,
    ]),
  ],
  providers: [
    OrderPricingService,
    OrderService,
    OrderFulfillmentService,
    InvoiceService,
    CheckoutService,
    CommerceAdminService,
    PaymentSettlementBatchService,
    CommerceResolver,
  ],
  exports: [
    CheckoutService,
    OrderService,
    InvoiceService,
    CommerceAdminService,
    PaymentSettlementBatchService,
  ],
})
export class CommerceModule {}
