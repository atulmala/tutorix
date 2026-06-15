import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformFeeService } from '../../platform-fee/services/platform-fee.service';
import { PlatformFeeCodeEnum } from '../../platform-fee/enums/platform-fee-code.enum';
import { ProficiencyTestFeeInfo } from '../dto/proficiency-test-fee-info.dto';
import { TutorOfferingPtFeeEntity } from '../entities/tutor-offering-pt-fee.entity';
import { TutorOfferingPtFeeStatusEnum } from '../enums/tutor-offering-pt-fee-status.enum';

@Injectable()
export class TutorOfferingPtFeeService {
  constructor(
    @InjectRepository(TutorOfferingPtFeeEntity)
    private readonly feeRepo: Repository<TutorOfferingPtFeeEntity>,
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

  mapToGraphql(entity: TutorOfferingPtFeeEntity): ProficiencyTestFeeInfo {
    return {
      listPriceInr: entity.listPriceInr,
      amountDueInr: entity.amountDueInr,
      collectionEnabled: entity.amountDueInr > 0,
      paymentStatus: entity.paymentStatus,
      displayLabel: this.buildDisplayLabel(
        entity.listPriceInr,
        entity.amountDueInr,
      ),
    };
  }

  async createForTutorOffering(
    tutorOfferingId: number,
  ): Promise<TutorOfferingPtFeeEntity> {
    const config = await this.platformFeeService.findByCode(
      PlatformFeeCodeEnum.PROFICIENCY_TEST,
    );
    const effectiveAmount =
      this.platformFeeService.getEffectiveAmountInr(config);
    const collectionEnabled = effectiveAmount > 0;
    const entity = this.feeRepo.create({
      tutorOfferingId,
      listPriceInr: config.amountInr,
      amountDueInr: collectionEnabled ? effectiveAmount : 0,
      paymentStatus: collectionEnabled
        ? TutorOfferingPtFeeStatusEnum.pending
        : TutorOfferingPtFeeStatusEnum.waived,
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

  async assertCanTakeProficiencyTest(tutorOfferingId: number): Promise<void> {
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
    const fee = await this.findByTutorOfferingId(tutorOfferingId);
    if (!fee) {
      throw new NotFoundException('Proficiency test fee record not found');
    }
    return this.mapToGraphql(fee);
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
