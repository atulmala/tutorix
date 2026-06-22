import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { OrderEntity } from '../entities/order.entity';
import { PaymentAttemptEntity } from '../entities/payment-attempt.entity';
import { AdminOrderDetail } from '../dto/admin/admin-order-detail.dto';
import { AdminOrderListInput } from '../dto/admin/admin-order-list.input';
import { AdminOrderListItem } from '../dto/admin/admin-order-list-item.dto';
import { AdminOrderListResult } from '../dto/admin/admin-order-list-result.dto';
import { InvoiceService } from './invoice.service';
import { OrderService } from './order.service';

@Injectable()
export class CommerceAdminService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(PaymentAttemptEntity)
    private readonly paymentAttemptRepo: Repository<PaymentAttemptEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly orderService: OrderService,
    private readonly invoiceService: InvoiceService,
  ) {}

  async listOrders(input: AdminOrderListInput): Promise<AdminOrderListResult> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const search = input.search?.trim();

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoin(User, 'user', 'user.id = order.user_id')
      .where('order.deleted = false');

    if (input.status) {
      qb.andWhere('order.status = :status', { status: input.status });
    }
    if (input.paymentMethod) {
      qb.andWhere('order.payment_method = :paymentMethod', {
        paymentMethod: input.paymentMethod,
      });
    }
    if (input.payerRole) {
      qb.andWhere('order.payer_role = :payerRole', {
        payerRole: input.payerRole,
      });
    }
    if (input.source) {
      qb.andWhere('order.source = :source', { source: input.source });
    }
    if (input.zeroAmountOnly) {
      qb.andWhere('order.amount_due_inr = 0');
    }
    if (search) {
      qb.andWhere(
        `(
          order.order_number ILIKE :search
          OR user.email ILIKE :search
          OR user.firstName ILIKE :search
          OR user.lastName ILIKE :search
          OR user.mobile ILIKE :search
        )`,
        { search: `%${search}%` },
      );
    }

    qb.orderBy('order.paid_at', 'DESC', 'NULLS LAST').addOrderBy(
      'order.createdDate',
      'DESC',
    );

    const totalCount = await qb.getCount();
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const rows = await qb
      .select([
        'order.id AS id',
        'order.order_number AS "orderNumber"',
        'order.status AS status',
        'order.payment_method AS "paymentMethod"',
        'order.payer_role AS "payerRole"',
        'order.source AS source',
        'order.user_id AS "userId"',
        'order.subtotal_inr AS "subtotalInr"',
        'order.discount_inr AS "discountInr"',
        'order.amount_due_inr AS "amountDueInr"',
        'order.amount_paid_inr AS "amountPaidInr"',
        'order.paid_at AS "paidAt"',
        'order.createdDate AS "createdDate"',
        'user.firstName AS "firstName"',
        'user.lastName AS "lastName"',
        'user.email AS email',
      ])
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany<{
        id: number;
        orderNumber: string;
        status: AdminOrderListItem['status'];
        paymentMethod: AdminOrderListItem['paymentMethod'];
        payerRole: AdminOrderListItem['payerRole'];
        source: AdminOrderListItem['source'];
        userId: number;
        subtotalInr: number;
        discountInr: number;
        amountDueInr: number;
        amountPaidInr: number;
        paidAt?: Date;
        createdDate: Date;
        firstName?: string;
        lastName?: string;
        email?: string;
      }>();

    const items: AdminOrderListItem[] = rows.map((row) => ({
      id: Number(row.id),
      orderNumber: row.orderNumber,
      status: row.status,
      paymentMethod: row.paymentMethod ?? undefined,
      payerRole: row.payerRole,
      source: row.source,
      userId: Number(row.userId),
      payerName:
        [row.firstName, row.lastName].filter(Boolean).join(' ').trim() ||
        undefined,
      payerEmail: row.email ?? undefined,
      subtotalInr: Number(row.subtotalInr),
      discountInr: Number(row.discountInr),
      amountDueInr: Number(row.amountDueInr),
      amountPaidInr: Number(row.amountPaidInr),
      paidAt: row.paidAt ?? undefined,
      createdDate: row.createdDate,
    }));

    return { items, totalCount, page, pageSize, totalPages };
  }

  async getOrderDetail(orderId: number): Promise<AdminOrderDetail> {
    const order = await this.orderService.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const user = await this.userRepo.findOne({
      where: { id: order.userId, deleted: false },
    });

    const paymentAttempts = await this.paymentAttemptRepo.find({
      where: { orderId: order.id, deleted: false },
      order: { id: 'DESC' },
    });

    const invoiceEntity = await this.invoiceService.findByOrderId(order.id);
    const invoice = invoiceEntity
      ? await this.invoiceService.toSummaryDto(invoiceEntity)
      : undefined;

    const orderDto = this.orderService.toDto(order);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      payerRole: order.payerRole,
      source: order.source,
      subtotalInr: order.subtotalInr,
      discountInr: order.discountInr,
      taxInr: order.taxInr,
      pointsRedeemed: order.pointsRedeemed,
      pointsValueInr: order.pointsValueInr,
      amountDueInr: order.amountDueInr,
      amountPaidInr: order.amountPaidInr,
      billingName: order.billingName,
      billingEmail: order.billingEmail,
      billingPhone: order.billingPhone,
      billingStateCode: order.billingStateCode,
      paidAt: order.paidAt,
      createdDate: order.createdDate,
      payer: {
        userId: order.userId,
        name:
          [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
          order.billingName ||
          undefined,
        email: user?.email ?? order.billingEmail ?? undefined,
        mobile: user?.mobile ?? order.billingPhone ?? undefined,
      },
      items: orderDto.items ?? [],
      invoice,
      paymentAttempts,
    };
  }
}
