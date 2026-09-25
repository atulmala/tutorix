import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rateForModeAndQuantity } from '@tutorix/shared-utils';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import {
  OrderItemReferenceTypeEnum,
  OrderItemTypeEnum,
  OrderPayerRoleEnum,
  OrderPaymentMethodEnum,
  OrderSourceEnum,
  OrderStatusEnum,
} from '../../commerce/enums/commerce.enums';
import { InvoiceService } from '../../commerce/services/invoice.service';
import { OrderService } from '../../commerce/services/order.service';
import { PlatformFeeLineInput } from '../../commerce/services/order-pricing.service';
import { WalletPurchaseResultDto } from '../../wallet/dto/wallet-checkout.dto';
import { WalletPurchaseReferenceTypeEnum } from '../../wallet/enums/wallet.enums';
import { WalletService } from '../../wallet/services/wallet.service';
import { StudentClassCreditService } from './student-class-credit.service';
import { ProficiencyTestService } from '../../proficiency/services/proficiency-test.service';
import { StudentService } from '../../student/services/student.service';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { TutorOfferingStatusEnum } from '../../tutor/enums/tutor.enums';
import { TutorRateCardService } from '../../tutor-rate-card/services/tutor-rate-card.service';
import { StudentCartDto, StudentCartItemDto } from '../dto/student-cart.dto';
import { StudentCartItemEntity } from '../entities/student-cart-item.entity';
import { StudentCartEntity } from '../entities/student-cart.entity';

function asId(value: string | number): number {
  const id = Number(value);
  if (!Number.isFinite(id) || id < 1) {
    throw new NotFoundException('Not found');
  }
  return id;
}

function personName(user?: { firstName?: string | null; lastName?: string | null } | null): string {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
}

@Injectable()
export class StudentCartService {
  constructor(
    private readonly studentService: StudentService,
    private readonly rateCardService: TutorRateCardService,
    private readonly proficiencyTestService: ProficiencyTestService,
    private readonly walletService: WalletService,
    private readonly orderService: OrderService,
    private readonly invoiceService: InvoiceService,
    private readonly creditService: StudentClassCreditService,
    @InjectRepository(StudentCartEntity)
    private readonly cartRepo: Repository<StudentCartEntity>,
    @InjectRepository(StudentCartItemEntity)
    private readonly itemRepo: Repository<StudentCartItemEntity>,
    @InjectRepository(TutorOfferingEntity)
    private readonly tutorOfferingRepo: Repository<TutorOfferingEntity>,
  ) {}

  async myCart(user: User): Promise<StudentCartDto> {
    const student = await this.requireStudent(user);
    const cart = await this.getOrCreateCart(student.id);
    return this.toCartDto(cart);
  }

  async addToCart(
    user: User,
    tutorIdInput: string | number,
    offeringIdInput: string | number,
    deliveryMode: ClassSessionDeliveryModeEnum,
    quantity: number,
  ): Promise<StudentCartDto> {
    const qty = this.requireQuantity(quantity);
    const student = await this.requireStudent(user);
    const tutorOffering = await this.resolveTutorOffering(
      asId(tutorIdInput),
      asId(offeringIdInput),
    );
    const unitRateInr = await this.unitRateFor(tutorOffering.id, deliveryMode, qty);
    const cart = await this.getOrCreateCart(student.id);
    const existing = (cart.items ?? []).find(
      (item) =>
        !item.deleted &&
        item.tutorOfferingId === tutorOffering.id &&
        item.deliveryMode === deliveryMode,
    );
    if (existing) {
      const nextQty = existing.quantity + qty;
      existing.quantity = nextQty;
      existing.unitRateInr = await this.unitRateFor(
        tutorOffering.id,
        deliveryMode,
        nextQty,
      );
      await this.itemRepo.save(existing);
    } else {
      await this.itemRepo.save(
        this.itemRepo.create({
          cartId: cart.id,
          tutorOfferingId: tutorOffering.id,
          deliveryMode,
          quantity: qty,
          unitRateInr,
        }),
      );
    }
    return this.toCartDto(await this.getOrCreateCart(student.id));
  }

  async updateCartItem(
    user: User,
    itemIdInput: string | number,
    quantity: number,
  ): Promise<StudentCartDto> {
    const qty = this.requireQuantity(quantity);
    const student = await this.requireStudent(user);
    const cart = await this.getOrCreateCart(student.id);
    const item = (cart.items ?? []).find(
      (row) => !row.deleted && row.id === asId(itemIdInput),
    );
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    item.quantity = qty;
    item.unitRateInr = await this.unitRateFor(
      item.tutorOfferingId,
      item.deliveryMode,
      qty,
    );
    await this.itemRepo.save(item);
    return this.toCartDto(await this.getOrCreateCart(student.id));
  }

  async removeFromCart(
    user: User,
    itemIdInput: string | number,
  ): Promise<StudentCartDto> {
    const student = await this.requireStudent(user);
    const cart = await this.getOrCreateCart(student.id);
    const item = (cart.items ?? []).find(
      (row) => !row.deleted && row.id === asId(itemIdInput),
    );
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    await this.itemRepo.delete(item.id);
    return this.toCartDto(await this.getOrCreateCart(student.id));
  }

  async clearCart(studentId: number): Promise<void> {
    const cart = await this.cartRepo.findOne({
      where: { studentId, deleted: false },
    });
    if (!cart) {
      return;
    }
    await this.itemRepo.delete({ cartId: cart.id });
  }

  async requirePricedCart(user: User): Promise<{
    cart: StudentCartEntity;
    items: StudentCartItemEntity[];
    dtos: StudentCartItemDto[];
    totalInr: number;
    lines: PlatformFeeLineInput[];
  }> {
    const student = await this.requireStudent(user);
    const cart = await this.getOrCreateCart(student.id);
    const items = (cart.items ?? []).filter((item) => !item.deleted);
    if (items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }
    const dtos: StudentCartItemDto[] = [];
    const lines: PlatformFeeLineInput[] = [];
    let totalInr = 0;
    for (const item of items) {
      const unitRateInr = await this.unitRateFor(
        item.tutorOfferingId,
        item.deliveryMode,
        item.quantity,
      );
      if (item.unitRateInr !== unitRateInr) {
        item.unitRateInr = unitRateInr;
        await this.itemRepo.save(item);
      }
      const dto = this.toItemDto(item);
      dtos.push(dto);
      totalInr += dto.lineTotalInr;
      const modeLabel = item.deliveryMode === 'online' ? 'Online' : 'Offline';
      lines.push({
        itemType: OrderItemTypeEnum.CLASS_BOOKING,
        description: `${dto.offeringLabel} · ${dto.tutorName} · ${modeLabel}`,
        referenceType: OrderItemReferenceTypeEnum.tutor_offering,
        referenceId: item.tutorOfferingId,
        unitRateInr,
        quantity: item.quantity,
        lineSubtotalInr: dto.lineTotalInr,
        discountInr: 0,
        waiverApplied: false,
        amountDueInr: dto.lineTotalInr,
      });
    }
    return { cart, items, dtos, totalInr, lines };
  }

  async completePaidCart(user: User): Promise<WalletPurchaseResultDto> {
    const student = await this.requireStudent(user);
    const priced = await this.requirePricedCart(user);
    const wallet = await this.walletService.getWalletForUser(user.id);
    if (wallet.balanceInr < priced.totalInr) {
      throw new BadRequestException(
        `Insufficient wallet balance. Please add at least ₹${priced.totalInr - wallet.balanceInr} to complete this transaction.`,
      );
    }

    const order = await this.orderService.createOrderWithItems({
      user,
      payerRole: OrderPayerRoleEnum.student,
      source: OrderSourceEnum.cart,
      lines: priced.lines,
      initialStatus: OrderStatusEnum.paid,
    });
    await this.orderService.markOrderPaid(
      order,
      OrderPaymentMethodEnum.wallet,
      priced.totalInr,
    );

    const updatedWallet = await this.walletService.debitPurchase({
      userId: user.id,
      amountInr: priced.totalInr,
      commerceOrderId: order.id,
      referenceType: WalletPurchaseReferenceTypeEnum.cart,
      referenceId: priced.cart.id,
      description: `Class booking · ${priced.dtos.length} pack${priced.dtos.length === 1 ? '' : 's'}`,
    });

    const paid = await this.orderService.findById(order.id);
    if (paid) {
      await this.creditService.fulfillPaidOrder(paid, student.id, priced.items);
      await this.invoiceService.generateForOrder(paid);
    }
    await this.clearCart(student.id);

    return {
      wallet: this.walletService.toWalletDto(updatedWallet),
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  }

  private async getOrCreateCart(studentId: number): Promise<StudentCartEntity> {
    let cart = await this.cartRepo.findOne({
      where: { studentId, deleted: false },
      relations: [
        'items',
        'items.tutorOffering',
        'items.tutorOffering.offering',
        'items.tutorOffering.tutor',
        'items.tutorOffering.tutor.user',
      ],
    });
    if (!cart) {
      cart = await this.cartRepo.save(this.cartRepo.create({ studentId }));
      cart.items = [];
    }
    cart.items = (cart.items ?? []).filter((item) => !item.deleted);
    return cart;
  }

  private async unitRateFor(
    tutorOfferingId: number,
    deliveryMode: ClassSessionDeliveryModeEnum,
    quantity: number,
  ): Promise<number> {
    const rateCard =
      await this.rateCardService.findByTutorOfferingId(tutorOfferingId);
    const rate = rateForModeAndQuantity(rateCard ?? {}, deliveryMode, quantity);
    if (rate == null || rate < 1) {
      throw new BadRequestException(
        'This delivery mode is not available for this offering',
      );
    }
    return rate;
  }

  private async resolveTutorOffering(
    tutorId: number,
    offeringId: number,
  ): Promise<TutorOfferingEntity> {
    const relations = ['tutor', 'tutor.user', 'offering'] as const;
    const exact = await this.tutorOfferingRepo.findOne({
      where: {
        tutorId,
        offeringId,
        status: TutorOfferingStatusEnum.pt_passed,
        deleted: false,
      },
      relations: [...relations],
    });
    if (this.isEligible(exact)) {
      return exact;
    }
    const coveringTest =
      await this.proficiencyTestService.findActiveTestForOffering(offeringId);
    if (coveringTest) {
      const covered = await this.tutorOfferingRepo.findOne({
        where: {
          tutorId,
          proficiencyTestId: coveringTest.id,
          status: TutorOfferingStatusEnum.pt_passed,
          deleted: false,
        },
        relations: [...relations],
      });
      if (this.isEligible(covered)) {
        return covered;
      }
    }
    throw new NotFoundException('Tutor offering not found');
  }

  private isEligible(
    row: TutorOfferingEntity | null,
  ): row is TutorOfferingEntity {
    return Boolean(
      row &&
        row.tutor &&
        !row.tutor.deleted &&
        row.tutor.onBoardingComplete === true,
    );
  }

  private async requireStudent(user: User) {
    if (String(user.role).toUpperCase() !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can use the class cart');
    }
    const student = await this.studentService.findByUserId(user.id);
    if (!student) {
      throw new ForbiddenException('Student profile not found');
    }
    return student;
  }

  private requireQuantity(quantity: number): number {
    const qty = Math.floor(Number(quantity));
    if (!Number.isFinite(qty) || qty < 1 || qty > 50) {
      throw new BadRequestException('Choose between 1 and 50 classes');
    }
    return qty;
  }

  private toCartDto(cart: StudentCartEntity): StudentCartDto {
    const items = (cart.items ?? []).filter((item) => !item.deleted).map((item) =>
      this.toItemDto(item),
    );
    return {
      id: cart.id,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      totalInr: items.reduce((sum, item) => sum + item.lineTotalInr, 0),
    };
  }

  private toItemDto(item: StudentCartItemEntity): StudentCartItemDto {
    const offering = item.tutorOffering;
    return {
      id: item.id,
      tutorId: offering?.tutorId ?? 0,
      tutorOfferingId: item.tutorOfferingId,
      offeringId: offering?.offeringId ?? 0,
      tutorName: personName(offering?.tutor?.user) || 'Tutor',
      offeringLabel: offering?.offering?.displayName ?? 'Class',
      deliveryMode: item.deliveryMode,
      quantity: item.quantity,
      unitRateInr: item.unitRateInr,
      lineTotalInr: item.unitRateInr * item.quantity,
    };
  }
}
