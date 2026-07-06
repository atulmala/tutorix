import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import './enums/wallet.enums';
import { CommerceModule } from '../commerce/commerce.module';
import { PaymentModule } from '../payment/payment.module';
import { PlatformFeeModule } from '../platform-fee/platform-fee.module';
import { TutorModule } from '../tutor/tutor.module';
import { StudentModule } from '../student/student.module';
import { UserWalletEntity } from './entities/user-wallet.entity';
import { WalletTransactionEntity } from './entities/wallet-transaction.entity';
import { PaymentAttemptEntity } from '../commerce/entities/payment-attempt.entity';
import { OrderItemEntity } from '../commerce/entities/order-item.entity';
import { PlatformFeePaymentEntity } from '../payment/entities/platform-fee-payment.entity';
import { WalletService } from './services/wallet.service';
import { WalletCheckoutService } from './services/wallet-checkout.service';
import { WalletResolver } from './resolvers/wallet.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserWalletEntity,
      WalletTransactionEntity,
      PaymentAttemptEntity,
      OrderItemEntity,
      PlatformFeePaymentEntity,
    ]),
    PlatformFeeModule,
    forwardRef(() => CommerceModule),
    forwardRef(() => PaymentModule),
    forwardRef(() => TutorModule),
    StudentModule,
  ],
  providers: [WalletService, WalletCheckoutService, WalletResolver],
  exports: [WalletService, WalletCheckoutService],
})
export class WalletModule {}
