import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { CheckoutResultDto } from '../../commerce/dto/checkout-result.dto';
import {
  OrderItemFulfillmentStatusEnum,
  OrderItemReferenceTypeEnum,
  OrderItemTypeEnum,
  OrderPayerRoleEnum,
  OrderPaymentMethodEnum,
  OrderSourceEnum,
  OrderStatusEnum,
  PaymentAttemptStatusEnum,
} from '../../commerce/enums/commerce.enums';
import { PaymentAttemptEntity } from '../../commerce/entities/payment-attempt.entity';
import { OrderItemEntity } from '../../commerce/entities/order-item.entity';
import { OrderEntity } from '../../commerce/entities/order.entity';
import { InvoiceService } from '../../commerce/services/invoice.service';
import { OrderFulfillmentService } from '../../commerce/services/order-fulfillment.service';
import { OrderPricingService } from '../../commerce/services/order-pricing.service';
import { OrderService } from '../../commerce/services/order.service';
import { PlatformFeeCodeEnum } from '../../platform-fee/enums/platform-fee-code.enum';
import { PlatformFeeService } from '../../platform-fee/services/platform-fee.service';
import { PlatformFeeConfigEntity } from '../../platform-fee/entities/platform-fee-config.entity';
import { PaymentGatewayFactory } from '../../payment/services/payment-gateway.factory';
import { PaymentGateway } from '../../payment/interfaces/payment-gateway.interface';
import { RazorpayGateway } from '../../payment/services/payment-gateways';
import { PaymentOrderSessionDto } from '../../payment/dto/payment-order-session.dto';
import { PaymentOrderSession } from '../../payment/interfaces/payment-gateway.interface';
import {
  PlatformFeePaymentContextTypeEnum,
  PlatformFeePaymentStatusEnum,
} from '../../payment/enums/payment.enums';
import { PlatformFeePaymentEntity } from '../../payment/entities/platform-fee-payment.entity';
import { buildRazorpayReceiptFromOrderNumber } from '../../payment/utils/payment-receipt.util';
import { TutorOfferingPtFeeStatusEnum } from '../../tutor/enums/tutor-offering-pt-fee-status.enum';
import { TutorOfferingService } from '../../tutor/services/tutor-offering.service';
import { TutorOfferingPtFeeService } from '../../tutor/services/tutor-offering-pt-fee.service';
import { TutorService } from '../../tutor/services/tutor.service';
import {
  WalletPurchasePreviewDto,
  WalletPurchaseResultDto,
  WalletTopUpResultDto,
} from '../dto/wallet-checkout.dto';
import {
  ConfirmWalletTopUpInput,
  WalletPurchaseIntentInput,
  WalletTopUpInput,
} from '../dto/wallet.input';
import {
  WalletPurchaseItemTypeEnum,
  WalletPurchaseReferenceTypeEnum,
} from '../enums/wallet.enums';
import { WalletOfferingLabelService } from './wallet-offering-label.service';
import {
  WALLET_STANDALONE_TOP_UP_MAX_INR,
  WALLET_STANDALONE_TOP_UP_MIN_INR,
} from '@tutorix/shared-utils';
import { WalletService } from './wallet.service';
import { CommunicationService } from '../../communication/communication.service';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';

type ResolvedPurchase = {
  itemType: OrderItemTypeEnum;
  referenceType: OrderItemReferenceTypeEnum;
  referenceId: number;
  amountInr: number;
  description: string;
  payerRole: OrderPayerRoleEnum;
  feeCode: PlatformFeeCodeEnum;
  feeContextType: PlatformFeePaymentContextTypeEnum;
  feeContextId: number;
};

@Injectable()
export class WalletCheckoutService {
  private readonly logger = new Logger(WalletCheckoutService.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly orderService: OrderService,
    private readonly orderPricingService: OrderPricingService,
    private readonly orderFulfillmentService: OrderFulfillmentService,
    private readonly invoiceService: InvoiceService,
    private readonly platformFeeService: PlatformFeeService,
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
    private readonly tutorService: TutorService,
    private readonly tutorOfferingService: TutorOfferingService,
    private readonly ptFeeService: TutorOfferingPtFeeService,
    private readonly walletOfferingLabelService: WalletOfferingLabelService,
    private readonly communicationService: CommunicationService,
    @InjectRepository(PaymentAttemptEntity)
    private readonly paymentAttemptRepo: Repository<PaymentAttemptEntity>,
    @InjectRepository(PlatformFeePaymentEntity)
    private readonly platformFeePaymentRepo: Repository<PlatformFeePaymentEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
  ) {}

  async prepareWalletPurchase(
    user: User,
    purchaseIntent: WalletPurchaseIntentInput,
  ): Promise<WalletPurchasePreviewDto> {
    const purchase = await this.resolvePurchase(user, purchaseIntent);
    const wallet = await this.walletService.getWalletForUser(user.id);
    const shortfallInr = Math.max(0, purchase.amountInr - wallet.balanceInr);

    return {
      purchaseAmountInr: purchase.amountInr,
      walletBalanceInr: wallet.balanceInr,
      shortfallInr,
      canPayFromWallet: wallet.balanceInr >= purchase.amountInr,
      purchaseDescription: purchase.description,
    };
  }

  async completeWalletPurchase(
    user: User,
    purchaseIntent: WalletPurchaseIntentInput,
  ): Promise<WalletPurchaseResultDto> {
    const purchase = await this.resolvePurchase(user, purchaseIntent);
    const wallet = await this.walletService.getWalletForUser(user.id);
    if (wallet.balanceInr < purchase.amountInr) {
      throw new BadRequestException(
        `Insufficient wallet balance. Please add at least ₹${purchase.amountInr - wallet.balanceInr} to complete this transaction.`,
      );
    }

    const config = await this.platformFeeService.findByCode(purchase.feeCode);
    const line = this.orderPricingService.buildPlatformFeeLine(
      config,
      purchase.referenceType,
      purchase.referenceId,
      purchase.amountInr,
    );

    const existingOrder = await this.orderService.findPaidOrderByItemReference(
      user.id,
      line,
    );
    if (existingOrder) {
      const currentWallet = await this.walletService.getWalletForUser(user.id);
      return {
        wallet: this.walletService.toWalletDto(currentWallet),
        orderId: existingOrder.id,
        orderNumber: existingOrder.orderNumber,
      };
    }

    const order = await this.orderService.createOrderWithItems({
      user,
      payerRole: purchase.payerRole,
      source: OrderSourceEnum.wallet,
      lines: [line],
      initialStatus: OrderStatusEnum.paid,
    });
    await this.orderService.markOrderPaid(
      order,
      OrderPaymentMethodEnum.wallet,
      purchase.amountInr,
    );

    const updatedWallet = await this.walletService.debitPurchase({
      userId: user.id,
      amountInr: purchase.amountInr,
      commerceOrderId: order.id,
      referenceType: purchase.referenceType,
      referenceId: purchase.referenceId,
      description: purchase.description,
    });

    await this.recordWalletFeePayment(user, purchase, config, order, purchase.amountInr);
    await this.orderFulfillmentService.fulfillOrderItems(
      order.id,
      user.id,
      config,
      purchase.amountInr,
    );
    const orderWithItems = await this.orderService.findById(order.id);
    if (orderWithItems) {
      await this.invoiceService.generateForOrder(orderWithItems);
    }

    return {
      wallet: this.walletService.toWalletDto(updatedWallet),
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  }

  async initiateWalletTopUp(
    user: User,
    input: WalletTopUpInput,
  ): Promise<CheckoutResultDto> {
    await this.walletService.assertUserOnboarded(user.id);
    if (input.amountInr <= 0) {
      throw new BadRequestException('Top-up amount must be greater than zero');
    }
    if (input.amountInr > WALLET_STANDALONE_TOP_UP_MAX_INR) {
      throw new BadRequestException(
        `Top-up amount cannot exceed ₹${WALLET_STANDALONE_TOP_UP_MAX_INR.toLocaleString('en-IN')}`,
      );
    }

    let minAmountInr = WALLET_STANDALONE_TOP_UP_MIN_INR;
    if (input.purchaseIntent) {
      const preview = await this.prepareWalletPurchase(user, input.purchaseIntent);
      if (preview.canPayFromWallet) {
        throw new BadRequestException(
          'Wallet balance is sufficient. Complete the purchase from wallet instead.',
        );
      }
      minAmountInr = preview.shortfallInr;
      if (input.amountInr < minAmountInr) {
        throw new BadRequestException(
          `Top-up amount must be at least ₹${minAmountInr} to complete this purchase`,
        );
      }
    } else if (input.amountInr < WALLET_STANDALONE_TOP_UP_MIN_INR) {
      throw new BadRequestException(
        `Top-up amount must be at least ₹${WALLET_STANDALONE_TOP_UP_MIN_INR}`,
      );
    }

    const line = {
      itemType: OrderItemTypeEnum.WALLET_TOP_UP,
      description: 'Wallet top-up',
      referenceType: OrderItemReferenceTypeEnum.tutor,
      referenceId: user.id,
      unitRateInr: input.amountInr,
      quantity: 1,
      lineSubtotalInr: input.amountInr,
      discountInr: 0,
      waiverApplied: false,
      amountDueInr: input.amountInr,
    };

    const payerRole = await this.resolvePayerRole(user);
    const order = await this.orderService.createOrderWithItems({
      user,
      payerRole,
      source: OrderSourceEnum.wallet,
      lines: [line],
      initialStatus: OrderStatusEnum.pending_payment,
    });
    await this.orderService.markOrderPendingPayment(order);

    const gateway = this.paymentGatewayFactory.getActiveGateway();
    const receipt = buildRazorpayReceiptFromOrderNumber(order.orderNumber);
    const session = await gateway.createOrder({
      amountInr: input.amountInr,
      receipt,
      notes: {
        description: 'Wallet top-up',
        commerceOrderNumber: order.orderNumber,
        amountDueInr: String(input.amountInr),
      },
      customer: {
        id: String(user.id),
        email: user.email ?? undefined,
        phone: user.mobile ?? undefined,
        name:
          [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
      },
    });

    await this.paymentAttemptRepo.save(
      this.paymentAttemptRepo.create({
        orderId: order.id,
        provider: session.provider,
        gatewayOrderId: session.orderId,
        amountInr: input.amountInr,
        status: PaymentAttemptStatusEnum.pending,
      }),
    );

    return {
      order: this.orderService.toDto(order),
      session: this.toSessionDto(session),
    };
  }

  async confirmWalletTopUp(
    user: User,
    input: ConfirmWalletTopUpInput,
  ): Promise<WalletTopUpResultDto> {
    const attempt = await this.paymentAttemptRepo.findOne({
      where: {
        gatewayOrderId: input.orderId,
        status: PaymentAttemptStatusEnum.pending,
        deleted: false,
      },
    });
    if (!attempt) {
      throw new BadRequestException('Pending wallet top-up not found');
    }

    const order = await this.orderService.findByIdForUser(attempt.orderId, user.id);
    if (!order) {
      throw new BadRequestException('Wallet top-up order not found');
    }
    const topUpItem = order.items?.find(
      (item) => item.itemType === OrderItemTypeEnum.WALLET_TOP_UP,
    );
    if (!topUpItem) {
      throw new BadRequestException('Invalid wallet top-up order');
    }

    const gateway = this.paymentGatewayFactory.getActiveGateway();
    if (input.provider && gateway.provider !== input.provider) {
      throw new BadRequestException('Payment provider mismatch');
    }

    const { paymentId, verified } = await this.verifyGatewayPayment(gateway, input);
    if (!verified) {
      attempt.status = PaymentAttemptStatusEnum.failed;
      await this.paymentAttemptRepo.save(attempt);
      await this.orderService.markOrderFailed(order);
      throw new BadRequestException('Payment verification failed');
    }

    attempt.status = PaymentAttemptStatusEnum.paid;
    attempt.gatewayPaymentId = paymentId;
    await this.paymentAttemptRepo.save(attempt);

    await this.orderService.markOrderPaid(
      order,
      OrderPaymentMethodEnum.gateway,
      order.amountDueInr,
    );

    const updatedWallet = await this.walletService.creditTopUp({
      userId: user.id,
      amountInr: order.amountPaidInr,
      commerceOrderId: order.id,
      description: 'Wallet top-up',
    });

    void this.communicationService
      .emit({
        event: CommunicationEvent.WALLET_TOP_UP,
        userId: user.id,
        entityType: 'commerce_order',
        entityId: order.id,
        payload: {
          firstName: user.firstName?.trim() || 'there',
          amountInr: String(order.amountPaidInr),
          balanceInr: String(updatedWallet.balanceInr),
        },
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`WALLET_TOP_UP emit failed: ${message}`);
      });

    if (topUpItem) {
      topUpItem.fulfillmentStatus = OrderItemFulfillmentStatusEnum.fulfilled;
      await this.orderItemRepo.save(topUpItem);
    }

    const orderWithItems = await this.orderService.findById(order.id);
    if (orderWithItems) {
      await this.invoiceService.generateForOrder(orderWithItems);
    }

    let purchaseResult: WalletPurchaseResultDto | undefined;
    if (input.purchaseIntent) {
      purchaseResult = await this.completeWalletPurchase(user, input.purchaseIntent);
    }

    return {
      wallet: purchaseResult
        ? purchaseResult.wallet
        : this.walletService.toWalletDto(updatedWallet),
      purchaseOrderId: purchaseResult?.orderId,
      purchaseOrderNumber: purchaseResult?.orderNumber,
    };
  }

  private async resolvePurchase(
    user: User,
    intent: WalletPurchaseIntentInput,
  ): Promise<ResolvedPurchase> {
    await this.walletService.assertUserOnboarded(user.id);

    switch (intent.itemType) {
      case WalletPurchaseItemTypeEnum.PROFICIENCY_TEST:
        return this.resolveProficiencyTestPurchase(user, intent);
      default:
        throw new BadRequestException(`Unsupported purchase type ${intent.itemType}`);
    }
  }

  private async resolveProficiencyTestPurchase(
    user: User,
    intent: WalletPurchaseIntentInput,
  ): Promise<ResolvedPurchase> {
    if (intent.referenceType !== WalletPurchaseReferenceTypeEnum.tutor_offering) {
      throw new BadRequestException('Proficiency test purchases require tutor_offering reference');
    }

    const tutor = await this.tutorService.findByUserId(user.id);
    if (!tutor) {
      throw new NotFoundException('Tutor profile not found');
    }

    const tutorOffering = await this.tutorOfferingService.findByIdForTutor(
      intent.referenceId,
      tutor.id,
    );
    if (tutorOffering.isInitialOnboarding) {
      throw new BadRequestException(
        'Proficiency test fee is not required during initial onboarding',
      );
    }

    const fee = await this.ptFeeService.findByTutorOfferingId(intent.referenceId);
    if (!fee) {
      throw new NotFoundException('Proficiency test fee record not found');
    }
    if (
      fee.paymentStatus === TutorOfferingPtFeeStatusEnum.paid ||
      fee.paymentStatus === TutorOfferingPtFeeStatusEnum.waived
    ) {
      throw new BadRequestException('Proficiency test fee is already paid');
    }
    if (fee.amountDueInr <= 0) {
      throw new BadRequestException('No payment is required for this proficiency test');
    }

    const description =
      await this.walletOfferingLabelService.buildProficiencyTestDescription(
        intent.referenceId,
      );

    return {
      itemType: OrderItemTypeEnum.PROFICIENCY_TEST,
      referenceType: OrderItemReferenceTypeEnum.tutor_offering,
      referenceId: intent.referenceId,
      amountInr: fee.amountDueInr,
      description,
      payerRole: OrderPayerRoleEnum.tutor,
      feeCode: PlatformFeeCodeEnum.PROFICIENCY_TEST,
      feeContextType: PlatformFeePaymentContextTypeEnum.tutor_offering,
      feeContextId: intent.referenceId,
    };
  }

  private async resolvePayerRole(user: User): Promise<OrderPayerRoleEnum> {
    const tutor = await this.tutorService.findByUserId(user.id);
    if (tutor?.onBoardingComplete) {
      return OrderPayerRoleEnum.tutor;
    }
    return OrderPayerRoleEnum.student;
  }

  private async recordWalletFeePayment(
    user: User,
    purchase: ResolvedPurchase,
    config: PlatformFeeConfigEntity,
    order: OrderEntity,
    amountPaidInr: number,
  ): Promise<void> {
    const discountAmountInr = this.platformFeeService.getDiscountAmountInr(config);
    await this.platformFeePaymentRepo.save(
      this.platformFeePaymentRepo.create({
        feeCode: purchase.feeCode,
        userId: user.id,
        contextType: purchase.feeContextType,
        contextId: purchase.feeContextId,
        listPriceInr: config.amountInr,
        discountType: config.discountType,
        discountValue: config.discountValue,
        discountAmountInr,
        amountPaidInr,
        commerceOrderId: order.id,
        gatewayOrderId: `wallet:${order.orderNumber}`,
        status: PlatformFeePaymentStatusEnum.paid,
        paidAt: new Date(),
      }),
    );
  }

  private async verifyGatewayPayment(
    gateway: PaymentGateway,
    input: {
      orderId: string;
      paymentId?: string;
      signature?: string;
      fetchFromGateway?: boolean;
    },
  ): Promise<{ paymentId: string; verified: boolean }> {
    if (input.fetchFromGateway) {
      if (!(gateway instanceof RazorpayGateway)) {
        throw new BadRequestException(
          'Fetching payment status from gateway is only supported for Razorpay',
        );
      }
      const fetched = await gateway.fetchCapturedPaymentForOrder(input.orderId);
      if (!fetched) {
        return { paymentId: '', verified: false };
      }
      return { paymentId: fetched.paymentId, verified: true };
    }

    const verified = await gateway.verifyPayment({
      orderId: input.orderId,
      paymentId: input.paymentId ?? '',
      signature: input.signature ?? '',
    });
    return { paymentId: input.paymentId ?? '', verified };
  }

  private toSessionDto(session: PaymentOrderSession): PaymentOrderSessionDto {
    return {
      skipped: false,
      provider: session.provider,
      orderId: session.orderId,
      amountInr: session.amountInr,
      currency: session.currency,
      checkoutPayloadJson: JSON.stringify(session.checkoutPayload),
    };
  }
}
