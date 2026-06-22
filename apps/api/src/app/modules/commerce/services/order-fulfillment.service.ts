import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformFeeConfigEntity } from '../../platform-fee/entities/platform-fee-config.entity';
import { StudentService } from '../../student/services/student.service';
import { StudentOnboardingStageEnum } from '../../student/enums/student.enums';
import { TutorService } from '../../tutor/services/tutor.service';
import { TutorCertificationStageEnum } from '../../tutor/enums/tutor.enums';
import { TutorOfferingPtFeeService } from '../../tutor/services/tutor-offering-pt-fee.service';
import { OrderItemEntity } from '../entities/order-item.entity';
import {
  OrderItemFulfillmentStatusEnum,
  OrderItemTypeEnum,
} from '../enums/commerce.enums';

@Injectable()
export class OrderFulfillmentService {
  constructor(
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
    private readonly moduleRef: ModuleRef,
  ) {}

  private get tutorService(): TutorService {
    return this.moduleRef.get(TutorService, { strict: false });
  }

  private get studentService(): StudentService {
    return this.moduleRef.get(StudentService, { strict: false });
  }

  private get ptFeeService(): TutorOfferingPtFeeService {
    return this.moduleRef.get(TutorOfferingPtFeeService, { strict: false });
  }

  async fulfillOrderItems(
    orderId: number,
    userId: number,
    config: PlatformFeeConfigEntity,
    effectiveAmountInr: number,
  ): Promise<void> {
    const items = await this.orderItemRepo.find({
      where: { orderId, deleted: false },
    });

    for (const item of items) {
      if (item.fulfillmentStatus === OrderItemFulfillmentStatusEnum.fulfilled) {
        continue;
      }
      await this.fulfillItem(item, userId, config, effectiveAmountInr);
    }
  }

  private async fulfillItem(
    item: OrderItemEntity,
    userId: number,
    config: PlatformFeeConfigEntity,
    effectiveAmountInr: number,
  ): Promise<void> {
    switch (item.itemType) {
      case OrderItemTypeEnum.TUTOR_REGISTRATION: {
        const tutor = await this.tutorService.findByUserId(userId);
        if (!tutor) {
          item.fulfillmentStatus = OrderItemFulfillmentStatusEnum.failed;
          await this.orderItemRepo.save(item);
          return;
        }
        tutor.regFeePaid = true;
        tutor.regFeeAmount = effectiveAmountInr;
        tutor.regFeeAmountToBePaid = config.amountInr;
        tutor.regFeeDate = new Date();
        await this.tutorService.saveTutor(tutor);
        if (
          tutor.certificationStage === TutorCertificationStageEnum.registrationPayment
        ) {
          await this.tutorService.updateCertificationStage(
            tutor.id,
            TutorCertificationStageEnum.docs,
          );
        }
        break;
      }
      case OrderItemTypeEnum.STUDENT_REGISTRATION: {
        const student = await this.studentService.ensureStudentExists(userId);
        student.regFeePaid = true;
        student.regFeeAmount = effectiveAmountInr;
        student.regFeeAmountToBePaid = config.amountInr;
        student.regFeeDate = new Date();
        await this.studentService.saveStudent(student);
        break;
      }
      case OrderItemTypeEnum.PROFICIENCY_TEST: {
        await this.ptFeeService.markPaid(
          item.referenceId,
          effectiveAmountInr <= 0 ? 'waived' : 'paid',
          effectiveAmountInr,
        );
        break;
      }
      default:
        break;
    }

    item.fulfillmentStatus = OrderItemFulfillmentStatusEnum.fulfilled;
    await this.orderItemRepo.save(item);
  }
}
