import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentModule } from '../payment/payment.module';
import { StudentCartModule } from '../student-cart/student-cart.module';
import { UserBankDetailsModule } from '../user-bank-details/user-bank-details.module';
import { Tutor } from '../tutor/entities/tutor.entity';
import { ClassCancellationRefundRequestEntity } from '../student-cart/entities/class-cancellation-refund-request.entity';
import { PostClassRefundClaimEntity } from '../student-cart/entities/post-class-refund-claim.entity';
import { ClassCreditGatewayRefundEntity } from '../student-cart/entities/class-credit-gateway-refund.entity';
import { UserBankDetailsEntity } from '../user-bank-details/entities/user-bank-details.entity';
import './enums/payment-disbursement-kind.enum';
import './enums/payment-disbursement-status.enum';
import './enums/payment-disbursement-source-type.enum';
import { PaymentDisbursementEntity } from './entities/payment-disbursement.entity';
import { TutorPayoutTransferEntity } from './entities/tutor-payout-transfer.entity';
import { AdminPaymentProcessingService } from './services/admin-payment-processing.service';
import { PaymentDisbursementEnqueueService } from './services/payment-disbursement-enqueue.service';
import { RazorpayXPayoutGateway } from './services/razorpayx-payout.gateway';
import { RefundPayoutCompletionService } from './services/refund-payout-completion.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      PaymentDisbursementEntity,
      TutorPayoutTransferEntity,
      ClassCancellationRefundRequestEntity,
      PostClassRefundClaimEntity,
      ClassCreditGatewayRefundEntity,
      Tutor,
      UserBankDetailsEntity,
    ]),
    forwardRef(() => PaymentModule),
    UserBankDetailsModule,
    forwardRef(() => StudentCartModule),
  ],
  providers: [
    PaymentDisbursementEnqueueService,
    RefundPayoutCompletionService,
    RazorpayXPayoutGateway,
    AdminPaymentProcessingService,
  ],
  exports: [
    PaymentDisbursementEnqueueService,
    RefundPayoutCompletionService,
    AdminPaymentProcessingService,
    RazorpayXPayoutGateway,
  ],
})
export class PaymentProcessingModule {}
