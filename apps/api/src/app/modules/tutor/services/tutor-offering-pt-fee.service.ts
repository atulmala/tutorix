import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformFeeService } from '../../platform-fee/services/platform-fee.service';
import { PlatformFeeCodeEnum } from '../../platform-fee/enums/platform-fee-code.enum';
import { PlatformFeeConfigEntity } from '../../platform-fee/entities/platform-fee-config.entity';
import { ProficiencyTestFeeInfo } from '../dto/proficiency-test-fee-info.dto';
import { TutorOfferingEntity } from '../entities/tutor-offering.entity';
import { TutorOfferingPtFeeEntity } from '../entities/tutor-offering-pt-fee.entity';
import { TutorOfferingPtFeeStatusEnum } from '../enums/tutor-offering-pt-fee-status.enum';

type ResolvedPtFeeTerms = {
  listPriceInr: number;
  amountDueInr: number;
  paymentStatus: TutorOfferingPtFeeStatusEnum;
};

@Injectable()
export class TutorOfferingPtFeeService {
  constructor(
    @InjectRepository(TutorOfferingPtFeeEntity)
    private readonly feeRepo: Repository<TutorOfferingPtFeeEntity>,
    @InjectRepository(TutorOfferingEntity)
    private readonly tutorOfferingRepo: Repository<TutorOfferingEntity>,
    private readonly platformFeeService: PlatformFeeService,
  ) {}

  buildDisplayLabel(listPriceInr: number, amountDueInr: number): string {
    if (amountDueInr <= 0) {
      return `₹${listPriceInr} — Free for now`;
    }
    return `₹${amountDueInr} due before test`;
  }

  async isCollectionEnabled(): Promise<boolean> {
    const config = await this.platformFeeService.findByCode(
      PlatformFeeCodeEnum.PROFICIENCY_TEST,
    );
    return this.platformFeeService.getEffectiveAmountInr(config) > 0;
  }

  private async requireTutorOffering(
    tutorOfferingId: number,
  ): Promise<TutorOfferingEntity> {
    const offering = await this.tutorOfferingRepo.findOne({
      where: { id: tutorOfferingId, deleted: false },
    });
    if (!offering) {
      throw new NotFoundException(`Tutor offering ${tutorOfferingId} not found`);
    }
    return offering;
  }

  private resolveFeeTerms(
    tutorOffering: TutorOfferingEntity,
    config: PlatformFeeConfigEntity,
  ): ResolvedPtFeeTerms {
    if (tutorOffering.isInitialOnboarding) {
      return {
        listPriceInr: config.amountInr,
        amountDueInr: 0,
        paymentStatus: TutorOfferingPtFeeStatusEnum.waived,
      };
    }

    const effectiveAmount =
      this.platformFeeService.getEffectiveAmountInr(config);
    const collectionEnabled = effectiveAmount > 0;
    return {
      listPriceInr: config.amountInr,
      amountDueInr: collectionEnabled ? effectiveAmount : 0,
      paymentStatus: collectionEnabled
        ? TutorOfferingPtFeeStatusEnum.pending
        : TutorOfferingPtFeeStatusEnum.waived,
    };
  }

  mapToGraphql(
    entity: TutorOfferingPtFeeEntity,
    tutorOffering?: TutorOfferingEntity,
  ): ProficiencyTestFeeInfo {
    const amountDueInr =
      tutorOffering?.isInitialOnboarding === true ? 0 : entity.amountDueInr;
    const paymentStatus =
      tutorOffering?.isInitialOnboarding === true
        ? TutorOfferingPtFeeStatusEnum.waived
        : entity.paymentStatus;

    return {
      listPriceInr: entity.listPriceInr,
      amountDueInr,
      collectionEnabled: amountDueInr > 0,
      paymentStatus,
      displayLabel: this.buildDisplayLabel(entity.listPriceInr, amountDueInr),
    };
  }

  async createForTutorOffering(
    tutorOfferingId: number,
  ): Promise<TutorOfferingPtFeeEntity> {
    const tutorOffering = await this.requireTutorOffering(tutorOfferingId);
    const config = await this.platformFeeService.findByCode(
      PlatformFeeCodeEnum.PROFICIENCY_TEST,
    );
    const terms = this.resolveFeeTerms(tutorOffering, config);
    const entity = this.feeRepo.create({
      tutorOfferingId,
      listPriceInr: terms.listPriceInr,
      amountDueInr: terms.amountDueInr,
      paymentStatus: terms.paymentStatus,
    });
    return this.feeRepo.save(entity);
  }

  async findByTutorOfferingId(
    tutorOfferingId: number,
  ): Promise<TutorOfferingPtFeeEntity | null> {
    return this.feeRepo.findOne({
      where: { tutorOfferingId, deleted: false },
    });
  }

  async ensureFeeRecordForTutorOffering(
    tutorOfferingId: number,
  ): Promise<TutorOfferingPtFeeEntity> {
    const existing = await this.findByTutorOfferingId(tutorOfferingId);
    if (existing) {
      return existing;
    }
    return this.createForTutorOffering(tutorOfferingId);
  }

  async assertCanTakeProficiencyTest(tutorOfferingId: number): Promise<void> {
    const tutorOffering = await this.requireTutorOffering(tutorOfferingId);
    if (tutorOffering.isInitialOnboarding) {
      return;
    }

    const fee = await this.findByTutorOfferingId(tutorOfferingId);
    if (!fee) {
      return;
    }
    if (fee.amountDueInr <= 0) {
      return;
    }
    if (
      fee.paymentStatus === TutorOfferingPtFeeStatusEnum.paid ||
      fee.paymentStatus === TutorOfferingPtFeeStatusEnum.waived
    ) {
      return;
    }
    throw new BadRequestException(
      `Proficiency test fee of ₹${fee.amountDueInr} must be paid before starting the test.`,
    );
  }

  async getFeeInfoForTutorOffering(
    tutorOfferingId: number,
  ): Promise<ProficiencyTestFeeInfo> {
    const tutorOffering = await this.requireTutorOffering(tutorOfferingId);
    const fee = await this.ensureFeeRecordForTutorOffering(tutorOfferingId);
    return this.mapToGraphql(fee, tutorOffering);
  }

  async markPaid(
    tutorOfferingId: number,
    gatewayOrderId: string,
    amountPaidInr: number,
  ): Promise<TutorOfferingPtFeeEntity> {
    const fee = await this.findByTutorOfferingId(tutorOfferingId);
    if (!fee) {
      throw new NotFoundException('Proficiency test fee record not found');
    }
    if (
      amountPaidInr > 0 &&
      fee.amountDueInr > 0 &&
      amountPaidInr !== fee.amountDueInr
    ) {
      throw new BadRequestException(
        `Payment amount ₹${amountPaidInr} does not match due amount ₹${fee.amountDueInr}`,
      );
    }
    fee.paymentStatus = TutorOfferingPtFeeStatusEnum.paid;
    fee.gatewayOrderId = gatewayOrderId;
    fee.amountDueInr = 0;
    fee.paidAt = new Date();
    return this.feeRepo.save(fee);
  }
}
