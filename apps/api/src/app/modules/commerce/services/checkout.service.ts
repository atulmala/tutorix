import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { PlatformFeeCodeEnum } from '../../platform-fee/enums/platform-fee-code.enum';
import { PlatformFeeConfigEntity } from '../../platform-fee/entities/platform-fee-config.entity';
import { PlatformFeeService } from '../../platform-fee/services/platform-fee.service';
import { PaymentGatewayFactory } from '../../payment/services/payment-gateway.factory';
import { PaymentOrderSessionDto } from '../../payment/dto/payment-order-session.dto';
import { PaymentOrderSession } from '../../payment/interfaces/payment-gateway.interface';
import {
  buildRazorpayReceiptFromOrderNumber,
} from '../../payment/utils/payment-receipt.util';
import { PlatformFeePaymentContextTypeEnum } from '../../payment/enums/payment.enums';
import { CheckoutResultDto } from '../dto/checkout-result.dto';
import { PaymentAttemptEntity } from '../entities/payment-attempt.entity';
import { OrderEntity } from '../entities/order.entity';
import {
  OrderItemReferenceTypeEnum,
  OrderItemTypeEnum,
  OrderPayerRoleEnum,
  OrderPaymentMethodEnum,
  OrderSourceEnum,
  OrderStatusEnum,
  PaymentAttemptStatusEnum,
} from '../enums/commerce.enums';
import { InvoiceService } from './invoice.service';
import { OrderFulfillmentService } from './order-fulfillment.service';
import { OrderPricingService } from './order-pricing.service';
import { OrderService } from './order.service';

export type PlatformFeeCheckoutContext = {
  feeCode: PlatformFeeCodeEnum;
  user: User;
  payerRole: OrderPayerRoleEnum;
  referenceType: OrderItemReferenceTypeEnum;
  referenceId: number;
  overrideAmountDueInr?: number;
};

@Injectable()
export class CheckoutService {
  constructor(
    private readonly platformFeeService: PlatformFeeService,
    private readonly orderPricingService: OrderPricingService,
    private readonly orderService: OrderService,
    private readonly orderFulfillmentService: OrderFulfillmentService,
    private readonly invoiceService: InvoiceService,
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
    @InjectRepository(PaymentAttemptEntity)
    private readonly paymentAttemptRepo: Repository<PaymentAttemptEntity>,
  ) {}

  async initiatePlatformFeeCheckout(
    ctx: PlatformFeeCheckoutContext,
  ): Promise<CheckoutResultDto> {
    const config = await this.platformFeeService.findByCode(ctx.feeCode);
    const line = this.orderPricingService.buildPlatformFeeLine(
      config,
      ctx.referenceType,
      ctx.referenceId,
      ctx.overrideAmountDueInr,
    );

    const existingOrder = await this.orderService.findPaidOrderByItemReference(
      ctx.user.id,
      line,
    );
    if (existingOrder) {
      return this.buildResult(existingOrder, { skipped: true });
    }

    const initialStatus =
      line.amountDueInr <= 0
        ? OrderStatusEnum.paid
        : OrderStatusEnum.pending_payment;

    const order = await this.orderService.createOrderWithItems({
      user: ctx.user,
      payerRole: ctx.payerRole,
      source: OrderSourceEnum.onboarding,
      lines: [line],
      initialStatus,
    });

    if (line.amountDueInr <= 0) {
      await this.orderService.markOrderPaid(
        order,
        OrderPaymentMethodEnum.waived,
        0,
      );
      await this.orderFulfillmentService.fulfillOrderItems(
        order.id,
        ctx.user.id,
        config,
        0,
      );
      order.status = OrderStatusEnum.paid;
      order.paymentMethod = OrderPaymentMethodEnum.waived;
      order.amountPaidInr = 0;
      order.paidAt = new Date();
      await this.invoiceService.generateForOrder(order);
      return this.buildResult(order, { skipped: true });
    }

    await this.orderService.markOrderPendingPayment(order);

    const gateway = this.paymentGatewayFactory.getActiveGateway();
    const receipt = buildRazorpayReceiptFromOrderNumber(order.orderNumber);
    const session = await gateway.createOrder({
      amountInr: line.amountDueInr,
      receipt,
      notes: {
        description: config.displayName,
        feeCode: ctx.feeCode,
        commerceOrderNumber: order.orderNumber,
        listPriceInr: String(line.lineSubtotalInr),
        discountAmountInr: String(line.discountInr),
        discountType: config.discountType,
        discountValue: String(config.discountValue),
        amountDueInr: String(line.amountDueInr),
      },
      customer: {
        id: String(ctx.user.id),
        email: ctx.user.email ?? undefined,
        phone: ctx.user.mobile ?? undefined,
        name:
          [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(' ') ||
          undefined,
      },
    });

    await this.paymentAttemptRepo.save(
      this.paymentAttemptRepo.create({
        orderId: order.id,
        provider: session.provider,
        gatewayOrderId: session.orderId,
        amountInr: line.amountDueInr,
        status: PaymentAttemptStatusEnum.pending,
      }),
    );

    return this.buildResult(order, this.toSessionDto(session));
  }

  async completePaidOrderFromGateway(
    gatewayOrderId: string,
    gatewayPaymentId: string,
    config: PlatformFeeConfigEntity,
    userId: number,
    effectiveAmountInr: number,
  ): Promise<OrderEntity | null> {
    const attempt = await this.paymentAttemptRepo.findOne({
      where: {
        gatewayOrderId,
        status: PaymentAttemptStatusEnum.pending,
        deleted: false,
      },
    });
    if (!attempt) {
      return null;
    }

    attempt.status = PaymentAttemptStatusEnum.paid;
    attempt.gatewayPaymentId = gatewayPaymentId;
    await this.paymentAttemptRepo.save(attempt);

    const order = await this.orderService.findById(attempt.orderId);
    if (!order || order.status === OrderStatusEnum.paid) {
      return order;
    }

    await this.orderService.markOrderPaid(
      order,
      OrderPaymentMethodEnum.gateway,
      effectiveAmountInr,
    );
    await this.orderFulfillmentService.fulfillOrderItems(
      order.id,
      userId,
      config,
      effectiveAmountInr,
    );
    const orderWithItems = await this.orderService.findById(order.id);
    if (orderWithItems) {
      await this.invoiceService.generateForOrder(orderWithItems);
    }
    return orderWithItems;
  }

  async markPaymentAttemptFailed(gatewayOrderId: string): Promise<void> {
    const attempt = await this.paymentAttemptRepo.findOne({
      where: {
        gatewayOrderId,
        status: PaymentAttemptStatusEnum.pending,
        deleted: false,
      },
    });
    if (!attempt) {
      return;
    }
    attempt.status = PaymentAttemptStatusEnum.failed;
    await this.paymentAttemptRepo.save(attempt);

    const order = await this.orderService.findById(attempt.orderId);
    if (order && order.status === OrderStatusEnum.pending_payment) {
      await this.orderService.markOrderFailed(order);
    }
  }

  async findOrderByGatewayOrderId(
    gatewayOrderId: string,
  ): Promise<OrderEntity | null> {
    const attempt = await this.paymentAttemptRepo.findOne({
      where: { gatewayOrderId, deleted: false },
    });
    if (!attempt) {
      return null;
    }
    return this.orderService.findById(attempt.orderId);
  }

  static mapFeeCodeToItemType(
    feeCode: PlatformFeeCodeEnum,
  ): OrderItemTypeEnum {
    switch (feeCode) {
      case PlatformFeeCodeEnum.TUTOR_REGISTRATION:
        return OrderItemTypeEnum.TUTOR_REGISTRATION;
      case PlatformFeeCodeEnum.STUDENT_REGISTRATION:
        return OrderItemTypeEnum.STUDENT_REGISTRATION;
      case PlatformFeeCodeEnum.PROFICIENCY_TEST:
        return OrderItemTypeEnum.PROFICIENCY_TEST;
      default:
        return OrderItemTypeEnum.TUTOR_REGISTRATION;
    }
  }

  static mapFeeCodeToReferenceType(
    feeCode: PlatformFeeCodeEnum,
  ): OrderItemReferenceTypeEnum {
    switch (feeCode) {
      case PlatformFeeCodeEnum.TUTOR_REGISTRATION:
        return OrderItemReferenceTypeEnum.tutor;
      case PlatformFeeCodeEnum.STUDENT_REGISTRATION:
        return OrderItemReferenceTypeEnum.student;
      case PlatformFeeCodeEnum.PROFICIENCY_TEST:
        return OrderItemReferenceTypeEnum.tutor_offering;
      default:
        return OrderItemReferenceTypeEnum.tutor;
    }
  }

  static mapFeeCodeToPayerRole(
    feeCode: PlatformFeeCodeEnum,
  ): OrderPayerRoleEnum {
    return feeCode === PlatformFeeCodeEnum.STUDENT_REGISTRATION
      ? OrderPayerRoleEnum.student
      : OrderPayerRoleEnum.tutor;
  }

  static mapContextTypeToReferenceType(
    contextType: PlatformFeePaymentContextTypeEnum,
  ): OrderItemReferenceTypeEnum {
    switch (contextType) {
      case PlatformFeePaymentContextTypeEnum.tutor:
        return OrderItemReferenceTypeEnum.tutor;
      case PlatformFeePaymentContextTypeEnum.student:
        return OrderItemReferenceTypeEnum.student;
      case PlatformFeePaymentContextTypeEnum.tutor_offering:
        return OrderItemReferenceTypeEnum.tutor_offering;
      default:
        return OrderItemReferenceTypeEnum.tutor;
    }
  }

  private buildResult(
    order: OrderEntity,
    session: PaymentOrderSessionDto,
  ): CheckoutResultDto {
    return {
      order: this.orderService.toDto(order),
      session,
    };
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
