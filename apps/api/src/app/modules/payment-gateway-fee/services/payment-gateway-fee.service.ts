import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentGatewayProviderEnum } from '../../payment/enums/payment.enums';
import { AdminCreatePaymentGatewayFeeInput } from '../dto/admin-create-payment-gateway-fee.input';
import { AdminPaymentGatewayFeeConfigResult } from '../dto/admin-payment-gateway-fee-config.dto';
import { AdminUpdatePaymentGatewayFeeInput } from '../dto/admin-update-payment-gateway-fee.input';
import { AdminUpdatePaymentGatewayFeeSettingsInput } from '../dto/admin-update-payment-gateway-fee-settings.input';
import { PaymentGatewayFeeConfigEntity } from '../entities/payment-gateway-fee-config.entity';
import {
  DEFAULT_PAYMENT_GATEWAY_GST_RATE_PERCENT,
  PaymentGatewayFeeSettingsEntity,
} from '../entities/payment-gateway-fee-settings.entity';

const SETTINGS_SINGLETON_ID = 1;

const DEFAULT_GATEWAY_ROWS: {
  provider: string;
  displayName: string;
  chargePercent: number;
}[] = [
  { provider: PaymentGatewayProviderEnum.razorpay, displayName: 'Razorpay', chargePercent: 2 },
  {
    provider: PaymentGatewayProviderEnum.cashfree,
    displayName: 'Cashfree',
    chargePercent: 1.6,
  },
];

export type PaymentGatewayFeePayoutConfig = {
  gstRatePercent: number;
  chargePercentByProvider: Map<string, number>;
};

@Injectable()
export class PaymentGatewayFeeService implements OnModuleInit {
  private readonly logger = new Logger(PaymentGatewayFeeService.name);

  constructor(
    @InjectRepository(PaymentGatewayFeeSettingsEntity)
    private readonly settingsRepo: Repository<PaymentGatewayFeeSettingsEntity>,
    @InjectRepository(PaymentGatewayFeeConfigEntity)
    private readonly configRepo: Repository<PaymentGatewayFeeConfigEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureDefaults();
    } catch (error) {
      this.logger.warn(
        'Could not ensure payment gateway fee config (migration may not have run yet)',
        error instanceof Error ? error.message : error,
      );
    }
  }

  async getAdminConfig(): Promise<AdminPaymentGatewayFeeConfigResult> {
    await this.ensureDefaults();
    const settings = await this.ensureSettingsSingleton();
    const gateways = await this.configRepo.find({
      where: { deleted: false },
      order: { displayName: 'ASC' },
    });
    return {
      gstRatePercent: this.toNumber(settings.gstRatePercent),
      gateways,
    };
  }

  async updateSettings(
    input: AdminUpdatePaymentGatewayFeeSettingsInput,
  ): Promise<AdminPaymentGatewayFeeConfigResult> {
    this.validatePercent(input.gstRatePercent, 'GST rate');
    const settings = await this.ensureSettingsSingleton();
    settings.gstRatePercent = input.gstRatePercent;
    await this.settingsRepo.save(settings);
    return this.getAdminConfig();
  }

  async createGateway(
    input: AdminCreatePaymentGatewayFeeInput,
  ): Promise<PaymentGatewayFeeConfigEntity> {
    this.validatePercent(input.chargePercent, 'Gateway charge');
    const displayName = input.displayName.trim();
    if (!displayName) {
      throw new BadRequestException('Gateway name is required');
    }
    const provider = input.providerKey?.trim()
      ? this.normalizeProviderKey(input.providerKey)
      : this.slugifyDisplayName(displayName);
    await this.ensureDefaults();
    const existing = await this.configRepo.findOne({ where: { provider } });
    if (existing && !existing.deleted) {
      throw new BadRequestException(`Payment gateway "${provider}" already exists`);
    }
    if (existing?.deleted) {
      existing.deleted = false;
      existing.active = true;
      existing.displayName = displayName;
      existing.chargePercent = input.chargePercent;
      return this.configRepo.save(existing);
    }
    return this.configRepo.save(
      this.configRepo.create({
        provider,
        displayName,
        chargePercent: input.chargePercent,
      }),
    );
  }

  async updateGateway(
    input: AdminUpdatePaymentGatewayFeeInput,
  ): Promise<PaymentGatewayFeeConfigEntity> {
    this.validatePercent(input.chargePercent, 'Gateway charge');
    const provider = this.normalizeProviderKey(input.provider);
    await this.ensureDefaults();
    const row = await this.configRepo.findOne({
      where: { provider, deleted: false },
    });
    if (!row) {
      throw new BadRequestException(`Payment gateway "${provider}" not found`);
    }
    if (input.displayName != null) {
      row.displayName = input.displayName.trim() || row.displayName;
    }
    row.chargePercent = input.chargePercent;
    if (input.active != null) {
      row.active = input.active;
    }
    return this.configRepo.save(row);
  }

  async getPayoutConfig(): Promise<PaymentGatewayFeePayoutConfig> {
    await this.ensureDefaults();
    const settings = await this.ensureSettingsSingleton();
    const gateways = await this.configRepo.find({
      where: { deleted: false, active: true },
    });
    const chargePercentByProvider = new Map<string, number>();
    for (const row of gateways) {
      chargePercentByProvider.set(row.provider, this.toNumber(row.chargePercent));
    }
    return {
      gstRatePercent: this.toNumber(settings.gstRatePercent),
      chargePercentByProvider,
    };
  }

  resolveChargePercent(provider: string, config: PaymentGatewayFeePayoutConfig): number {
    const configured = config.chargePercentByProvider.get(provider);
    if (configured != null) {
      return configured;
    }
    const fallback = config.chargePercentByProvider.get(
      PaymentGatewayProviderEnum.razorpay,
    );
    return fallback ?? 0;
  }

  private normalizeProviderKey(raw: string): string {
    const key = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32);
    if (!key) {
      throw new BadRequestException('Invalid provider key');
    }
    return key;
  }

  private slugifyDisplayName(displayName: string): string {
    return this.normalizeProviderKey(displayName.replace(/\s+/g, '_'));
  }

  private validatePercent(value: number, label: string): void {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new BadRequestException(`${label} must be between 0 and 100`);
    }
  }

  private async ensureDefaults(): Promise<void> {
    await this.ensureSettingsSingleton();
    for (const seed of DEFAULT_GATEWAY_ROWS) {
      const existing = await this.configRepo.findOne({
        where: { provider: seed.provider },
      });
      if (!existing) {
        await this.configRepo.save(
          this.configRepo.create({
            provider: seed.provider,
            displayName: seed.displayName,
            chargePercent: seed.chargePercent,
          }),
        );
      }
    }
  }

  private async ensureSettingsSingleton(): Promise<PaymentGatewayFeeSettingsEntity> {
    let settings = await this.settingsRepo.findOne({
      where: { id: SETTINGS_SINGLETON_ID },
    });
    if (settings) {
      return settings;
    }
    settings = this.settingsRepo.create({
      id: SETTINGS_SINGLETON_ID,
      gstRatePercent: DEFAULT_PAYMENT_GATEWAY_GST_RATE_PERCENT,
    });
    try {
      return await this.settingsRepo.save(settings);
    } catch {
      const existing = await this.settingsRepo.findOne({
        where: { id: SETTINGS_SINGLETON_ID },
      });
      if (existing) {
        return existing;
      }
      throw new Error('Failed to create payment_gateway_fee_settings singleton row');
    }
  }

  private toNumber(value: number | string): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
