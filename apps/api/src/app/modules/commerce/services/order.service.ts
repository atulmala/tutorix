import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderItemEntity } from '../entities/order-item.entity';
import {
  OrderItemFulfillmentStatusEnum,
  OrderPayerRoleEnum,
  OrderPaymentMethodEnum,
  OrderSourceEnum,
  OrderStatusEnum,
} from '../enums/commerce.enums';
import { PlatformFeeLineInput } from './order-pricing.service';
import { CommerceOrderDto } from '../dto/commerce-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
  ) {}

  generateOrderNumber(): string {
    const date = new Date();
    const ymd =
      `${date.getFullYear()}`.slice(-2) +
      `${date.getMonth() + 1}`.padStart(2, '0') +
      `${date.getDate()}`.padStart(2, '0');
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `TX${ymd}${suffix}`;
  }

  async findPaidOrderByItemReference(
    userId: number,
    line: Pick<PlatformFeeLineInput, 'itemType' | 'referenceType' | 'referenceId'>,
  ): Promise<OrderEntity | null> {
    return this.orderRepo
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .where('order.user_id = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatusEnum.paid })
      .andWhere('order.deleted = false')
      .andWhere('item.item_type = :itemType', { itemType: line.itemType })
      .andWhere('item.reference_type = :referenceType', {
        referenceType: line.referenceType,
      })
      .andWhere('item.reference_id = :referenceId', {
        referenceId: line.referenceId,
      })
      .andWhere('item.deleted = false')
      .orderBy('order.id', 'DESC')
      .getOne();
  }

  async findById(orderId: number): Promise<OrderEntity | null> {
    return this.orderRepo.findOne({
      where: { id: orderId, deleted: false },
      relations: ['items'],
    });
  }

  async findByIdForUser(orderId: number, userId: number): Promise<OrderEntity | null> {
    return this.orderRepo.findOne({
      where: { id: orderId, userId, deleted: false },
      relations: ['items'],
    });
  }

  async createOrderWithItems(params: {
    user: User;
    payerRole: OrderPayerRoleEnum;
    source: OrderSourceEnum;
    lines: PlatformFeeLineInput[];
    initialStatus: OrderStatusEnum;
  }): Promise<OrderEntity> {
    const { user, payerRole, source, lines, initialStatus } = params;
    const subtotalInr = lines.reduce((sum, l) => sum + l.lineSubtotalInr, 0);
    const discountInr = lines.reduce((sum, l) => sum + l.discountInr, 0);
    const amountDueInr = lines.reduce((sum, l) => sum + l.amountDueInr, 0);

    const order = this.orderRepo.create({
      orderNumber: this.generateOrderNumber(),
      userId: user.id,
      payerRole,
      status: initialStatus,
      subtotalInr,
      discountInr,
      taxInr: 0,
      amountDueInr,
      amountPaidInr: 0,
      billingName: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
      billingEmail: user.email ?? undefined,
      billingPhone: user.mobile ?? undefined,
      source,
    });
    const savedOrder = await this.orderRepo.save(order);

    const items = lines.map((line) =>
      this.orderItemRepo.create({
        orderId: savedOrder.id,
        itemType: line.itemType,
        description: line.description,
        quantity: line.quantity,
        unitRateInr: line.unitRateInr,
        lineSubtotalInr: line.lineSubtotalInr,
        discountInr: line.discountInr,
        waiverApplied: line.waiverApplied,
        referenceType: line.referenceType,
        referenceId: line.referenceId,
        fulfillmentStatus: OrderItemFulfillmentStatusEnum.pending,
      }),
    );
    await this.orderItemRepo.save(items);
    savedOrder.items = items;
    return savedOrder;
  }

  async markOrderPaid(
    order: OrderEntity,
    paymentMethod: OrderPaymentMethodEnum,
    amountPaidInr: number,
  ): Promise<OrderEntity> {
    order.status = OrderStatusEnum.paid;
    order.paymentMethod = paymentMethod;
    order.amountPaidInr = amountPaidInr;
    order.paidAt = new Date();
    return this.orderRepo.save(order);
  }

  async markOrderPendingPayment(order: OrderEntity): Promise<OrderEntity> {
    order.status = OrderStatusEnum.pending_payment;
    return this.orderRepo.save(order);
  }

  async markOrderFailed(order: OrderEntity): Promise<OrderEntity> {
    order.status = OrderStatusEnum.failed;
    return this.orderRepo.save(order);
  }

  toDto(order: OrderEntity): CommerceOrderDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotalInr: order.subtotalInr,
      discountInr: order.discountInr,
      taxInr: order.taxInr,
      amountDueInr: order.amountDueInr,
      amountPaidInr: order.amountPaidInr,
      paymentMethod: order.paymentMethod,
      payerRole: order.payerRole,
      source: order.source,
      paidAt: order.paidAt,
      items: order.items?.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        description: item.description,
        quantity: item.quantity,
        unitRateInr: item.unitRateInr,
        lineSubtotalInr: item.lineSubtotalInr,
        discountInr: item.discountInr,
        waiverApplied: item.waiverApplied,
        cgstInr: item.cgstInr,
        sgstInr: item.sgstInr,
        igstInr: item.igstInr,
        gstRatePercent: Number(item.gstRatePercent),
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        fulfillmentStatus: item.fulfillmentStatus,
      })),
    };
  }
}
