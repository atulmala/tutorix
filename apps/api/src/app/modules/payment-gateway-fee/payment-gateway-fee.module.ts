import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentGatewayFeeConfigEntity } from './entities/payment-gateway-fee-config.entity';
import { PaymentGatewayFeeSettingsEntity } from './entities/payment-gateway-fee-settings.entity';
import { PaymentGatewayFeeService } from './services/payment-gateway-fee.service';
import { PaymentProviderSelectionService } from './services/payment-provider-selection.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentGatewayFeeSettingsEntity,
      PaymentGatewayFeeConfigEntity,
    ]),
  ],
  providers: [PaymentGatewayFeeService, PaymentProviderSelectionService],
  exports: [PaymentGatewayFeeService, PaymentProviderSelectionService],
})
export class PaymentGatewayFeeModule {}
