import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  isPtFeeCollectionEnabled,
  PT_ATTEMPT_LIST_PRICE_INR,
} from '../../../config/pt-fee.config';
import { ProficiencyTestFeeInfo } from '../dto/proficiency-test-fee-info.dto';
import { TutorOfferingPtFeeEntity } from '../entities/tutor-offering-pt-fee.entity';
import { TutorOfferingPtFeeStatusEnum } from '../enums/tutor-offering-pt-fee-status.enum';

@Injectable()
export class TutorOfferingPtFeeService {
  constructor(
    @InjectRepository(TutorOfferingPtFeeEntity)
    private readonly feeRepo: Repository<TutorOfferingPtFeeEntity>,
  ) {}

  buildDisplayLabel(listPriceInr: number, amountDueInr: number): string {
    if (amountDueInr <= 0) {
      return `₹${listPriceInr} — Free for now`;
    }
    return `₹${amountDueInr} due before test`;
  }

  mapToGraphql(entity: TutorOfferingPtFeeEntity): ProficiencyTestFeeInfo {
    const collectionEnabled = isPtFeeCollectionEnabled();
    return {
      listPriceInr: entity.listPriceInr,
      amountDueInr: entity.amountDueInr,
      collectionEnabled,
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
    const collectionEnabled = isPtFeeCollectionEnabled();
    const entity = this.feeRepo.create({
      tutorOfferingId,
      listPriceInr: PT_ATTEMPT_LIST_PRICE_INR,
      amountDueInr: collectionEnabled ? PT_ATTEMPT_LIST_PRICE_INR : 0,
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
    if (!isPtFeeCollectionEnabled()) {
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
}
