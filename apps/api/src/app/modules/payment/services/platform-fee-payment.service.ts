import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PlatformFeePaymentEntity } from '../entities/platform-fee-payment.entity';
import { PlatformFeeService } from '../../platform-fee/services/platform-fee.service';
import { PlatformFeeCodeEnum } from '../../platform-fee/enums/platform-fee-code.enum';
import { PlatformFeeConfigEntity } from '../../platform-fee/entities/platform-fee-config.entity';
import { PaymentGatewayFactory } from './payment-gateway.factory';
import { PaymentOrderSessionDto } from '../dto/payment-order-session.dto';
import { ConfirmPlatformFeePaymentInput } from '../dto/confirm-platform-fee-payment.input';
import {
  PlatformFeePaymentContextTypeEnum,
  PlatformFeePaymentStatusEnum,
} from '../enums/payment.enums';
import { TutorService } from '../../tutor/services/tutor.service';
import { StudentService } from '../../student/services/student.service';
import { TutorCertificationStageEnum } from '../../tutor/enums/tutor.enums';
import { StudentOnboardingStageEnum } from '../../student/enums/student.enums';
import { User } from '../../auth/entities/user.entity';
import {
  OrderItemReferenceTypeEnum,
  OrderPayerRoleEnum,
} from '../../commerce/enums/commerce.enums';
import { TutorOfferingPtFeeService } from '../../tutor/services/tutor-offering-pt-fee.service';
import { TutorOfferingService } from '../../tutor/services/tutor-offering.service';
import { TutorOfferingPtFeeStatusEnum } from '../../tutor/enums/tutor-offering-pt-fee-status.enum';
import { ConfirmPtFeePaymentInput } from '../dto/confirm-pt-fee-payment.input';
import { AuthService } from '../../auth/services/auth.service';
import { CheckoutService } from '../../commerce/services/checkout.service';
import { CheckoutResultDto } from '../../commerce/dto/checkout-result.dto';
import { OrderService } from '../../commerce/services/order.service';

export interface FeePaymentContext {
  user: User;
  contextType: PlatformFeePaymentContextTypeEnum;
  contextId: number;
  validateStage: () => Promise<void>;
  onPaymentComplete: (
    config: PlatformFeeConfigEntity,
    effectiveAmountInr: number,
  ) => Promise<void>;
}

@Injectable()
export class PlatformFeePaymentService {
  constructor(
    @InjectRepository(PlatformFeePaymentEntity)
    private readonly paymentRepo: Repository<PlatformFeePaymentEntity>,
    private readonly platformFeeService: PlatformFeeService,
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
    private readonly checkoutService: CheckoutService,
    private readonly orderService: OrderService,
    private readonly moduleRef: ModuleRef,
  ) {}

  private get tutorService(): TutorService {
    return this.moduleRef.get(TutorService, { strict: false });
  }

  private get studentService(): StudentService {
    return this.moduleRef.get(StudentService, { strict: false });
  }

  private get tutorOfferingService(): TutorOfferingService {
    return this.moduleRef.get(TutorOfferingService, { strict: false });
  }

  private get ptFeeService(): TutorOfferingPtFeeService {
    return this.moduleRef.get(TutorOfferingPtFeeService, { strict: false });
  }

  private get authService(): AuthService {
    return this.moduleRef.get(AuthService, { strict: false });
  }

  private async getCompletedPayment(
    feeCode: PlatformFeeCodeEnum,
    userId: number,
    contextType: PlatformFeePaymentContextTypeEnum,
    contextId: number,
  ): Promise<PlatformFeePaymentEntity | null> {
    return this.paymentRepo.findOne({
      where: {
        feeCode,
        userId,
        contextType,
        contextId,
        deleted: false,
        status: In([
          PlatformFeePaymentStatusEnum.paid,
          PlatformFeePaymentStatusEnum.waived,
        ]),
      },
    });
  }

  private buildContext(
    feeCode: PlatformFeeCodeEnum,
    user: User,
  ): Promise<FeePaymentContext> {
    switch (feeCode) {
      case PlatformFeeCodeEnum.TUTOR_REGISTRATION:
        return this.buildTutorRegistrationContext(user);
      case PlatformFeeCodeEnum.STUDENT_REGISTRATION:
        return this.buildStudentRegistrationContext(user);
      default:
        throw new BadRequestException(
          `Use initiatePtFeePayment for fee code ${feeCode}`,
        );
    }
  }

  private async buildTutorRegistrationContext(
    user: User,
  ): Promise<FeePaymentContext> {
    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new NotFoundException('Tutor profile not found');
    }
    return {
      user,
      contextType: PlatformFeePaymentContextTypeEnum.tutor,
      contextId: tutor.id,
      validateStage: async () => {
        if (
          tutor.certificationStage !==
          TutorCertificationStageEnum.registrationPayment
        ) {
          throw new BadRequestException(
            'Can only pay registration fee at registrationPayment stage',
          );
        }
      },
      onPaymentComplete: async (config, effectiveAmountInr) => {
        const current = await this.tutorService.findByUserId(user.id);
        if (!current) {
          throw new NotFoundException('Tutor profile not found');
        }
        current.regFeePaid = true;
        current.regFeeAmount = effectiveAmountInr;
        current.regFeeAmountToBePaid = config.amountInr;
        current.regFeeDate = new Date();
        await this.tutorService.saveTutor(current);
        await this.tutorService.updateCertificationStage(
          current.id,
          TutorCertificationStageEnum.docs,
        );
      },
    };
  }

  private async buildStudentRegistrationContext(
    user: User,
  ): Promise<FeePaymentContext> {
    const student = await this.studentService.ensureStudentExists(user.id);
    return {
      user,
      contextType: PlatformFeePaymentContextTypeEnum.student,
      contextId: student.id,
      validateStage: async () => {
        if (
          student.onBoardingComplete ||
          student.onboardingStage !==
            StudentOnboardingStageEnum.registrationPayment
        ) {
          throw new BadRequestException(
            'Can only pay registration fee at registrationPayment stage',
          );
        }
      },
      onPaymentComplete: async (config, effectiveAmountInr) => {
        const current = await this.studentService.ensureStudentExists(user.id);
        current.regFeePaid = true;
        current.regFeeAmount = effectiveAmountInr;
        current.regFeeAmountToBePaid = config.amountInr;
        current.regFeeDate = new Date();
        await this.studentService.saveStudent(current);
      },
    };
  }

  private async recordPayment(
    config: PlatformFeeConfigEntity,
    ctx: FeePaymentContext,
    status: PlatformFeePaymentStatusEnum,
    amountPaidInr: number,
    commerceOrderId?: number,
    gatewayProvider?: PlatformFeePaymentEntity['gatewayProvider'],
    gatewayOrderId?: string,
    gatewayPaymentId?: string,
  ): Promise<PlatformFeePaymentEntity> {
    const discountAmountInr = this.platformFeeService.getDiscountAmountInr(config);
    const entity = this.paymentRepo.create({
      feeCode: config.code,
      userId: ctx.user.id,
      contextType: ctx.contextType,
      contextId: ctx.contextId,
      listPriceInr: config.amountInr,
      discountType: config.discountType,
      discountValue: config.discountValue,
      discountAmountInr,
      amountPaidInr,
      commerceOrderId,
      gatewayProvider,
      gatewayOrderId,
      gatewayPaymentId,
      status,
      paidAt:
        status === PlatformFeePaymentStatusEnum.paid ||
        status === PlatformFeePaymentStatusEnum.waived
          ? new Date()
          : undefined,
    });
    return this.paymentRepo.save(entity);
  }

  private skippedSession(): PaymentOrderSessionDto {
    return { skipped: true };
  }

  private async checkoutResultFromExistingPayment(
    existing: PlatformFeePaymentEntity,
  ): Promise<CheckoutResultDto> {
    if (existing.commerceOrderId) {
      const order = await this.orderService.findById(existing.commerceOrderId);
      if (order) {
        return {
          order: this.orderService.toDto(order),
          session: this.skippedSession(),
        };
      }
    }
    const referenceType = CheckoutService.mapContextTypeToReferenceType(
      existing.contextType,
    );
    const order = await this.orderService.findPaidOrderByItemReference(
      existing.userId,
      {
        itemType: CheckoutService.mapFeeCodeToItemType(existing.feeCode),
        referenceType,
        referenceId: existing.contextId,
      },
    );
    if (order) {
      if (!existing.commerceOrderId) {
        existing.commerceOrderId = order.id;
        await this.paymentRepo.save(existing);
      }
      return {
        order: this.orderService.toDto(order),
        session: this.skippedSession(),
      };
    }
    const user = await this.authService.findById(existing.userId);
    if (!user) {
      throw new NotFoundException('User not found for existing payment');
    }
    const result = await this.checkoutService.initiatePlatformFeeCheckout({
      feeCode: existing.feeCode,
      user,
      payerRole: CheckoutService.mapFeeCodeToPayerRole(existing.feeCode),
      referenceType,
      referenceId: existing.contextId,
    });
    existing.commerceOrderId = result.order.id;
    await this.paymentRepo.save(existing);
    return result;
  }

  async initiatePlatformFeePayment(
    feeCode: PlatformFeeCodeEnum,
    user: User,
  ): Promise<CheckoutResultDto> {
    const ctx = await this.buildContext(feeCode, user);
    await ctx.validateStage();

    const existing = await this.getCompletedPayment(
      feeCode,
      user.id,
      ctx.contextType,
      ctx.contextId,
    );
    if (existing) {
      return this.checkoutResultFromExistingPayment(existing);
    }

    const config = await this.platformFeeService.findByCode(feeCode);
    const checkoutResult = await this.checkoutService.initiatePlatformFeeCheckout({
      feeCode,
      user,
      payerRole: CheckoutService.mapFeeCodeToPayerRole(feeCode),
      referenceType: CheckoutService.mapContextTypeToReferenceType(ctx.contextType),
      referenceId: ctx.contextId,
    });

    const effectiveAmountInr = checkoutResult.order.amountDueInr;
    if (effectiveAmountInr <= 0) {
      await this.recordPayment(
        config,
        ctx,
        PlatformFeePaymentStatusEnum.waived,
        0,
        checkoutResult.order.id,
      );
    } else {
      await this.recordPayment(
        config,
        ctx,
        PlatformFeePaymentStatusEnum.pending,
        effectiveAmountInr,
        checkoutResult.order.id,
        checkoutResult.session?.provider,
        checkoutResult.session?.orderId,
      );
    }

    return checkoutResult;
  }

  async confirmPlatformFeePayment(
    input: ConfirmPlatformFeePaymentInput,
    user: User,
  ): Promise<CheckoutResultDto> {
    const ctx = await this.buildContext(input.feeCode, user);
    await ctx.validateStage();

    const pending = await this.paymentRepo.findOne({
      where: {
        feeCode: input.feeCode,
        userId: user.id,
        contextType: ctx.contextType,
        contextId: ctx.contextId,
        gatewayOrderId: input.orderId,
        status: PlatformFeePaymentStatusEnum.pending,
        deleted: false,
      },
    });
    if (!pending) {
      throw new BadRequestException('Pending payment not found for this order');
    }

    const gateway = this.paymentGatewayFactory.getActiveGateway();
    if (input.provider && gateway.provider !== input.provider) {
      throw new BadRequestException('Payment provider mismatch');
    }

    const verified = await gateway.verifyPayment({
      orderId: input.orderId,
      paymentId: input.paymentId,
      signature: input.signature,
    });
    if (!verified) {
      pending.status = PlatformFeePaymentStatusEnum.failed;
      await this.paymentRepo.save(pending);
      await this.checkoutService.markPaymentAttemptFailed(input.orderId);
      throw new BadRequestException('Payment verification failed');
    }

    pending.status = PlatformFeePaymentStatusEnum.paid;
    pending.gatewayPaymentId = input.paymentId;
    pending.paidAt = new Date();
    await this.paymentRepo.save(pending);

    const config = await this.platformFeeService.findByCode(input.feeCode);
    await this.checkoutService.completePaidOrderFromGateway(
      input.orderId,
      input.paymentId,
      config,
      user.id,
      pending.amountPaidInr,
    );

    const order = pending.commerceOrderId
      ? await this.orderService.findById(pending.commerceOrderId)
      : null;
    if (!order) {
      throw new BadRequestException('Commerce order not found after payment');
    }
    return {
      order: this.orderService.toDto(order),
      session: this.skippedSession(),
    };
  }

  async completeRegistrationPaymentStep(user: User) {
    const ctx = await this.buildTutorRegistrationContext(user);
    await ctx.validateStage();

    const paid = await this.getCompletedPayment(
      PlatformFeeCodeEnum.TUTOR_REGISTRATION,
      user.id,
      ctx.contextType,
      ctx.contextId,
    );

    if (!paid) {
      const result = await this.initiatePlatformFeePayment(
        PlatformFeeCodeEnum.TUTOR_REGISTRATION,
        user,
      );
      if (result.session && !result.session.skipped) {
        throw new BadRequestException(
          'Payment is required before completing this step',
        );
      }
    }

    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new NotFoundException('Tutor profile not found');
    }
    if (tutor.certificationStage === TutorCertificationStageEnum.registrationPayment) {
      return this.tutorService.updateCertificationStage(
        tutor.id,
        TutorCertificationStageEnum.docs,
      );
    }
    return tutor;
  }

  async completeStudentRegistrationPaymentStep(user: User) {
    const ctx = await this.buildStudentRegistrationContext(user);
    const student = await this.studentService.ensureStudentExists(user.id);
    if (student.onBoardingComplete) {
      return student;
    }
    await ctx.validateStage();

    const paid = await this.getCompletedPayment(
      PlatformFeeCodeEnum.STUDENT_REGISTRATION,
      user.id,
      ctx.contextType,
      ctx.contextId,
    );

    if (!paid) {
      const result = await this.initiatePlatformFeePayment(
        PlatformFeeCodeEnum.STUDENT_REGISTRATION,
        user,
      );
      if (result.session && !result.session.skipped) {
        throw new BadRequestException(
          'Payment is required before completing this step',
        );
      }
    }

    const updated = await this.studentService.ensureStudentExists(user.id);
    updated.onBoardingComplete = true;
    updated.onboardingStageEnteredAt = new Date();
    return this.studentService.saveStudent(updated);
  }

  async initiatePtFeePayment(
    user: User,
    tutorOfferingId: number,
  ): Promise<CheckoutResultDto> {
    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new NotFoundException('Tutor profile not found');
    }
    await this.tutorOfferingService.findByIdForTutor(tutorOfferingId, tutor.id);

    const fee = await this.ptFeeService.findByTutorOfferingId(tutorOfferingId);
    if (!fee) {
      throw new NotFoundException('Proficiency test fee record not found');
    }

    const existing = await this.getCompletedPayment(
      PlatformFeeCodeEnum.PROFICIENCY_TEST,
      user.id,
      PlatformFeePaymentContextTypeEnum.tutor_offering,
      tutorOfferingId,
    );
    if (existing) {
      return this.checkoutResultFromExistingPayment(existing);
    }

    if (fee.paymentStatus === TutorOfferingPtFeeStatusEnum.paid) {
      throw new BadRequestException('Proficiency test fee is already paid');
    }

    const config = await this.platformFeeService.findByCode(
      PlatformFeeCodeEnum.PROFICIENCY_TEST,
    );
    const ctx: FeePaymentContext = {
      user,
      contextType: PlatformFeePaymentContextTypeEnum.tutor_offering,
      contextId: tutorOfferingId,
      validateStage: async () => undefined,
      onPaymentComplete: async () => undefined,
    };

    const checkoutResult = await this.checkoutService.initiatePlatformFeeCheckout({
      feeCode: PlatformFeeCodeEnum.PROFICIENCY_TEST,
      user,
      payerRole: OrderPayerRoleEnum.tutor,
      referenceType: OrderItemReferenceTypeEnum.tutor_offering,
      referenceId: tutorOfferingId,
      overrideAmountDueInr: fee.amountDueInr,
    });

    if (checkoutResult.order.amountDueInr <= 0) {
      await this.recordPayment(
        config,
        ctx,
        PlatformFeePaymentStatusEnum.waived,
        0,
        checkoutResult.order.id,
      );
    } else {
      await this.recordPayment(
        config,
        ctx,
        PlatformFeePaymentStatusEnum.pending,
        checkoutResult.order.amountDueInr,
        checkoutResult.order.id,
        checkoutResult.session?.provider,
        checkoutResult.session?.orderId,
      );
    }

    return checkoutResult;
  }

  async confirmPtFeePayment(
    input: ConfirmPtFeePaymentInput,
    user: User,
  ): Promise<CheckoutResultDto> {
    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new NotFoundException('Tutor profile not found');
    }
    await this.tutorOfferingService.findByIdForTutor(
      input.tutorOfferingId,
      tutor.id,
    );

    const pending = await this.paymentRepo.findOne({
      where: {
        feeCode: PlatformFeeCodeEnum.PROFICIENCY_TEST,
        userId: user.id,
        contextType: PlatformFeePaymentContextTypeEnum.tutor_offering,
        contextId: input.tutorOfferingId,
        gatewayOrderId: input.orderId,
        status: PlatformFeePaymentStatusEnum.pending,
        deleted: false,
      },
    });
    if (!pending) {
      throw new BadRequestException('Pending PT fee payment not found');
    }

    const gateway = this.paymentGatewayFactory.getActiveGateway();
    if (input.provider && gateway.provider !== input.provider) {
      throw new BadRequestException('Payment provider mismatch');
    }

    const verified = await gateway.verifyPayment({
      orderId: input.orderId,
      paymentId: input.paymentId,
      signature: input.signature,
    });
    if (!verified) {
      pending.status = PlatformFeePaymentStatusEnum.failed;
      await this.paymentRepo.save(pending);
      await this.checkoutService.markPaymentAttemptFailed(input.orderId);
      throw new BadRequestException('Payment verification failed');
    }

    pending.status = PlatformFeePaymentStatusEnum.paid;
    pending.gatewayPaymentId = input.paymentId;
    pending.paidAt = new Date();
    await this.paymentRepo.save(pending);

    const config = await this.platformFeeService.findByCode(
      PlatformFeeCodeEnum.PROFICIENCY_TEST,
    );
    await this.checkoutService.completePaidOrderFromGateway(
      input.orderId,
      input.paymentId,
      config,
      user.id,
      pending.amountPaidInr,
    );

    const order = pending.commerceOrderId
      ? await this.orderService.findById(pending.commerceOrderId)
      : null;
    if (!order) {
      throw new BadRequestException('Commerce order not found after payment');
    }
    return {
      order: this.orderService.toDto(order),
      session: this.skippedSession(),
    };
  }

  async fulfillPaymentFromGateway(
    orderId: string,
    paymentId: string,
  ): Promise<void> {
    const pending = await this.paymentRepo.findOne({
      where: {
        gatewayOrderId: orderId,
        status: PlatformFeePaymentStatusEnum.pending,
        deleted: false,
      },
    });
    if (!pending) {
      return;
    }

    pending.status = PlatformFeePaymentStatusEnum.paid;
    pending.gatewayPaymentId = paymentId;
    pending.paidAt = new Date();
    await this.paymentRepo.save(pending);

    const config = await this.platformFeeService.findByCode(pending.feeCode);
    await this.checkoutService.completePaidOrderFromGateway(
      orderId,
      paymentId,
      config,
      pending.userId,
      pending.amountPaidInr,
    );
  }

  async markPendingPaymentFailed(orderId: string): Promise<void> {
    const pending = await this.paymentRepo.findOne({
      where: {
        gatewayOrderId: orderId,
        status: PlatformFeePaymentStatusEnum.pending,
        deleted: false,
      },
    });
    if (!pending) {
      await this.checkoutService.markPaymentAttemptFailed(orderId);
      return;
    }
    pending.status = PlatformFeePaymentStatusEnum.failed;
    await this.paymentRepo.save(pending);
    await this.checkoutService.markPaymentAttemptFailed(orderId);
  }
}
