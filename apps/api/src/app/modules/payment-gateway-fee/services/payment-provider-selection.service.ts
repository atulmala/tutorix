import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentGatewayProviderEnum } from '../../payment/enums/payment.enums';
import { TutorPayoutProviderEnum } from '../enums/tutor-payout-provider.enum';
import {
  DEFAULT_PAYMENT_GATEWAY_GST_RATE_PERCENT,
  PaymentGatewayFeeSettingsEntity,
} from '../entities/payment-gateway-fee-settings.entity';

const SETTINGS_SINGLETON_ID = 1;

export type PaymentProviderSelection = {
  paymentGateway: PaymentGatewayProviderEnum;
  tutorPayoutProvider: TutorPayoutProviderEnum;
};

export const DEFAULT_PAYMENT_PROVIDER_SELECTION: PaymentProviderSelection = {
  paymentGateway: PaymentGatewayProviderEnum.razorpay,
  tutorPayoutProvider: TutorPayoutProviderEnum.razorpayx,
};

/**
 * Admin-chosen payment gateway and tutor payout provider. Read from the database on every
 * call so all API instances follow a switch immediately.
 */
@Injectable()
export class PaymentProviderSelectionService {
  private readonly logger = new Logger(PaymentProviderSelectionService.name);

  constructor(
    @InjectRepository(PaymentGatewayFeeSettingsEntity)
    private readonly settingsRepo: Repository<PaymentGatewayFeeSettingsEntity>,
  ) {}

  async getSelection(): Promise<PaymentProviderSelection> {
    let settings: PaymentGatewayFeeSettingsEntity | null;
    try {
      settings = await this.settingsRepo.findOne({ where: { id: SETTINGS_SINGLETON_ID } });
    } catch (error) {
      this.logger.warn(
        'Could not read payment provider selection (migration may not have run yet); using defaults',
        error instanceof Error ? error.message : error,
      );
      return DEFAULT_PAYMENT_PROVIDER_SELECTION;
    }
    return {
      paymentGateway: toPaymentGateway(settings?.activePaymentGateway),
      tutorPayoutProvider: toTutorPayoutProvider(settings?.tutorPayoutProvider),
    };
  }

  async updateSelection(
    update: Partial<PaymentProviderSelection>,
  ): Promise<PaymentProviderSelection> {
    let settings = await this.settingsRepo.findOne({ where: { id: SETTINGS_SINGLETON_ID } });
    if (!settings) {
      settings = this.settingsRepo.create({
        id: SETTINGS_SINGLETON_ID,
        gstRatePercent: DEFAULT_PAYMENT_GATEWAY_GST_RATE_PERCENT,
      });
    }
    if (update.paymentGateway) {
      settings.activePaymentGateway = update.paymentGateway;
    }
    if (update.tutorPayoutProvider) {
      settings.tutorPayoutProvider = update.tutorPayoutProvider;
    }
    await this.settingsRepo.save(settings);
    return this.getSelection();
  }
}

function toPaymentGateway(value: string | null | undefined): PaymentGatewayProviderEnum {
  return Object.values(PaymentGatewayProviderEnum).includes(value as PaymentGatewayProviderEnum)
    ? (value as PaymentGatewayProviderEnum)
    : DEFAULT_PAYMENT_PROVIDER_SELECTION.paymentGateway;
}

function toTutorPayoutProvider(value: string | null | undefined): TutorPayoutProviderEnum {
  return Object.values(TutorPayoutProviderEnum).includes(value as TutorPayoutProviderEnum)
    ? (value as TutorPayoutProviderEnum)
    : DEFAULT_PAYMENT_PROVIDER_SELECTION.tutorPayoutProvider;
}
