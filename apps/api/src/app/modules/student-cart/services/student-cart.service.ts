import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  bulkDiscountNudge,
  classPackSlabLinesForMode,
  isWithinOfflineBookingDistance,
  OFFLINE_BOOKING_MAX_DISTANCE_KM,
  quoteClassPack,
  type OfferingNodeForLabel,
} from '@tutorix/shared-utils';
import { distanceKmBetweenStudentAndTutor } from '../../tutor/utils/student-tutor-distance.util';
import { OfferingService } from '../../offerings/services/offering.service';
import {
  offeringsByIdFromCatalog,
  resolveStudentCartOfferingDisplay,
} from '../student-cart-offering-display.util';
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
import { CommunicationAudience } from '../../communication/enums/communication-audience.enum';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';
import { CommunicationService } from '../../communication/communication.service';
import { TutorClassEmailBatchService } from './tutor-class-email-batch.service';
import { PlatformFeeLineInput } from '../../commerce/services/order-pricing.service';
import { WalletPurchaseResultDto } from '../../wallet/dto/wallet-checkout.dto';
import { WalletPurchaseReferenceTypeEnum } from '../../wallet/enums/wallet.enums';
import { WalletService } from '../../wallet/services/wallet.service';
import { StudentClassCreditService } from './student-class-credit.service';
import { ProficiencyTestService } from '../../proficiency/services/proficiency-test.service';
import { Student } from '../../student/entities/student.entity';
import { StudentService } from '../../student/services/student.service';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { TutorOfferingStatusEnum } from '../../tutor/enums/tutor.enums';
import { TutorRateCardService } from '../../tutor-rate-card/services/tutor-rate-card.service';
import {
  buildClassBookingTable,
  formatInrAmount,
  type ClassBookingEmailLine,
} from '../class-booking-email-table.util';
import {
  StudentCartDto,
  StudentCartItemDto,
  StudentClassCreditDto,
} from '../dto/student-cart.dto';
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
  private readonly logger = new Logger(StudentCartService.name);

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
    private readonly offeringService: OfferingService,
    private readonly communicationService: CommunicationService,
    private readonly tutorEmailBatch: TutorClassEmailBatchService,
  ) {}

  async myCart(user: User): Promise<StudentCartDto> {
    const student = await this.requireStudent(user);
    const cart = await this.getOrCreateCart(student.id);
    return this.toCartDtoWithCatalog(cart);
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
    const catalogOfferingId = asId(offeringIdInput);
    const tutorOffering = await this.resolveTutorOffering(
      asId(tutorIdInput),
      catalogOfferingId,
    );
    if (deliveryMode === ClassSessionDeliveryModeEnum.offline) {
      this.assertOfflineBookingAllowed(student, tutorOffering);
    }
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
      if (!existing.catalogOfferingId) {
        existing.catalogOfferingId = catalogOfferingId;
      }
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
          catalogOfferingId,
          deliveryMode,
          quantity: qty,
          unitRateInr,
        }),
      );
    }
    return this.toCartDtoWithCatalog(await this.getOrCreateCart(student.id));
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
    return this.toCartDtoWithCatalog(await this.getOrCreateCart(student.id));
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
    return this.toCartDtoWithCatalog(await this.getOrCreateCart(student.id));
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
    const offeringsById = await this.loadOfferingsById();
    const dtos: StudentCartItemDto[] = [];
    const lines: PlatformFeeLineInput[] = [];
    let totalInr = 0;
    for (const item of items) {
      const quote = await this.quoteFor(
        item.tutorOfferingId,
        item.deliveryMode,
        item.quantity,
      );
      if (item.unitRateInr !== quote.unitRateInr) {
        item.unitRateInr = quote.unitRateInr;
        await this.itemRepo.save(item);
      }
      const dto = this.toItemDto(item, offeringsById);
      dtos.push(dto);
      totalInr += dto.lineTotalInr;
      const modeLabel = item.deliveryMode === 'online' ? 'Online' : 'Offline';
      lines.push({
        itemType: OrderItemTypeEnum.CLASS_BOOKING,
        description: `${dto.offeringLabel} · ${dto.tutorName} · ${modeLabel}`,
        referenceType: OrderItemReferenceTypeEnum.tutor_offering,
        referenceId: item.tutorOfferingId,
        unitRateInr: quote.unitRateInr,
        quantity: item.quantity,
        lineSubtotalInr: quote.listUnitRateInr * item.quantity,
        discountInr: quote.savingsInr,
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
    let pdfBuffer: Buffer | null = null;
    let invoiceNumber = order.orderNumber;
    if (paid) {
      await this.creditService.fulfillPaidOrder(paid, student.id, priced.items);
      const generated = await this.invoiceService.generateForOrderWithPdf(paid);
      pdfBuffer = generated.pdfBuffer;
      invoiceNumber = generated.invoice.invoiceNumber;
    }
    await this.clearCart(student.id);
    await this.emitClassBookingEmails({
      user,
      orderId: order.id,
      invoiceNumber,
      amountPaidInr: priced.totalInr,
      lines: this.bookingEmailLines(priced.dtos, priced.items),
      pdfBuffer,
    });

    return {
      wallet: this.walletService.toWalletDto(updatedWallet),
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  }

  async bookFreeDemo(
    user: User,
    tutorIdInput: string | number,
    offeringIdInput: string | number,
    deliveryMode: ClassSessionDeliveryModeEnum,
  ): Promise<StudentClassCreditDto> {
    const student = await this.requireStudent(user);
    const catalogOfferingId = asId(offeringIdInput);
    const tutorOffering = await this.resolveTutorOffering(
      asId(tutorIdInput),
      catalogOfferingId,
    );
    if (deliveryMode === ClassSessionDeliveryModeEnum.offline) {
      this.assertOfflineBookingAllowed(student, tutorOffering);
    }
    const rateCards = await this.rateCardService.resolveCompleteRateCards([
      tutorOffering,
    ]);
    const rateCard = rateCards.get(tutorOffering.id);
    if (!rateCard?.freeDemoOffered) {
      throw new BadRequestException(
        'This tutor does not offer a free demo for this subject',
      );
    }
    const modeEnabled =
      deliveryMode === ClassSessionDeliveryModeEnum.online
        ? rateCard.onlineEnabled === true
        : rateCard.offlineEnabled === true;
    if (!modeEnabled) {
      throw new BadRequestException(
        'This delivery mode is not available for the free demo',
      );
    }
    if (
      await this.creditService.hasActiveDemo(
        student.id,
        tutorOffering.tutorId,
        catalogOfferingId,
      )
    ) {
      throw new BadRequestException(
        'You have already booked a free demo for this subject with this tutor',
      );
    }

    const offeringsById = await this.loadOfferingsById();
    const { offeringLabel } = resolveStudentCartOfferingDisplay(
      catalogOfferingId,
      tutorOffering.offeringId,
      tutorOffering.offering?.displayName,
      offeringsById,
    );
    const tutorName = personName(tutorOffering.tutor?.user) || 'Tutor';
    const modeLabel =
      deliveryMode === ClassSessionDeliveryModeEnum.online ? 'Online' : 'Offline';
    const order = await this.orderService.createOrderWithItems({
      user,
      payerRole: OrderPayerRoleEnum.student,
      source: OrderSourceEnum.cart,
      initialStatus: OrderStatusEnum.paid,
      lines: [
        {
          itemType: OrderItemTypeEnum.CLASS_BOOKING,
          description: `Free demo · ${offeringLabel} · ${tutorName} · ${modeLabel}`,
          referenceType: OrderItemReferenceTypeEnum.tutor_offering,
          referenceId: tutorOffering.id,
          unitRateInr: 0,
          quantity: 1,
          lineSubtotalInr: 0,
          discountInr: 0,
          waiverApplied: true,
          amountDueInr: 0,
        },
      ],
    });
    await this.orderService.markOrderPaid(order, OrderPaymentMethodEnum.wallet, 0);
    const paid = await this.orderService.findById(order.id);
    const orderItem = paid?.items?.[0];
    if (!paid || !orderItem) {
      throw new BadRequestException('Could not book the free demo');
    }
    const credit = await this.creditService.issueDemoCredit({
      studentId: student.id,
      orderId: paid.id,
      orderItem,
      tutorOffering,
      catalogOfferingId,
      deliveryMode,
    });

    try {
      const generated = await this.invoiceService.generateForOrderWithPdf(paid);
      await this.emitClassBookingEmails({
        user,
        orderId: paid.id,
        invoiceNumber: generated.invoice.invoiceNumber,
        amountPaidInr: 0,
        lines: [
          {
            tutorUserId:
              tutorOffering.tutor?.userId ?? tutorOffering.tutor?.user?.id ?? null,
            tutorName,
            offeringLabel,
            deliveryMode,
            classCount: 1,
            lineAmountInr: 0,
            isDemo: true,
          },
        ],
        pdfBuffer: generated.pdfBuffer,
      });
    } catch (error) {
      this.logger.warn(
        `Free demo confirmation failed for order ${paid.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return credit;
  }

  private bookingEmailLines(
    dtos: StudentCartItemDto[],
    items: StudentCartItemEntity[],
  ): Array<ClassBookingEmailLine & { tutorUserId: number | null }> {
    return dtos.map((dto, index) => {
      const tutor = items[index]?.tutorOffering?.tutor;
      return {
        tutorUserId: tutor?.userId ?? tutor?.user?.id ?? null,
        tutorName: dto.tutorName,
        offeringLabel: dto.offeringLabel,
        deliveryMode: dto.deliveryMode,
        classCount: dto.quantity,
        lineAmountInr: dto.lineTotalInr,
      };
    });
  }

  private async emitClassBookingEmails(params: {
    user: User;
    orderId: number;
    invoiceNumber: string;
    amountPaidInr: number;
    lines: Array<ClassBookingEmailLine & { tutorUserId: number | null }>;
    pdfBuffer: Buffer | null;
  }): Promise<void> {
    const studentName = personName(params.user) || 'Student';
    const classCount = params.lines.reduce((sum, line) => sum + line.classCount, 0);
    const studentTable = buildClassBookingTable(params.lines, { includeAmount: true });
    try {
      if (!params.pdfBuffer) {
        this.logger.warn(
          `CLASS_BOOKED invoice PDF missing for order ${params.orderId}`,
        );
      }
      await this.communicationService.emit({
        event: CommunicationEvent.CLASS_BOOKED,
        userId: params.user.id,
        audience: CommunicationAudience.STUDENT,
        entityType: 'commerce_order',
        entityId: params.orderId,
        payload: {
          studentName,
          classCount: String(classCount),
          amountPaid: formatInrAmount(params.amountPaidInr),
          orderNumber: params.invoiceNumber,
          linesHtml: studentTable.html,
          linesText: studentTable.text,
        },
        emailAttachments: params.pdfBuffer
          ? [
              {
                filename: `invoice-${params.invoiceNumber}.pdf`,
                contentType: 'application/pdf',
                content: params.pdfBuffer,
              },
            ]
          : undefined,
      });

      const byTutor = new Map<number, typeof params.lines>();
      for (const line of params.lines) {
        if (line.tutorUserId == null) {
          this.logger.warn(
            `CLASS_BOOKED skipped tutor mail for order ${params.orderId}: missing tutor user`,
          );
          continue;
        }
        const group = byTutor.get(line.tutorUserId) ?? [];
        group.push(line);
        byTutor.set(line.tutorUserId, group);
      }

      for (const [tutorUserId, tutorLines] of byTutor) {
        await this.tutorEmailBatch.enqueueBookings(
          tutorLines.map((line, index) => ({
            tutorUserId,
            tutorName: line.tutorName,
            studentName,
            offeringLabel: line.offeringLabel,
            deliveryMode: line.deliveryMode,
            classCount: line.classCount,
            amountInr: line.lineAmountInr,
            isDemo: line.isDemo === true,
            sourceKey: `booking:${params.orderId}:${tutorUserId}:${index}:${line.offeringLabel}:${line.deliveryMode}`,
          })),
        );
      }
    } catch (error) {
      this.logger.warn(
        `CLASS_BOOKED emit failed for order ${params.orderId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
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
    return (await this.quoteFor(tutorOfferingId, deliveryMode, quantity)).unitRateInr;
  }

  private async quoteFor(
    tutorOfferingId: number,
    deliveryMode: ClassSessionDeliveryModeEnum,
    quantity: number,
  ): Promise<{
    unitRateInr: number;
    listUnitRateInr: number;
    discountPct: number;
    savingsInr: number;
  }> {
    const tutorOffering = await this.tutorOfferingRepo.findOne({
      where: { id: tutorOfferingId, deleted: false },
    });
    if (!tutorOffering) {
      throw new NotFoundException('Tutor offering not found');
    }
    const resolvedMap = await this.rateCardService.resolveCompleteRateCards([
      tutorOffering,
    ]);
    const rateCard = resolvedMap.get(tutorOfferingId) ?? null;
    const quote = quoteClassPack(rateCard ?? {}, deliveryMode, quantity);
    if (quote == null || quote.unitRateInr < 1) {
      throw new BadRequestException(
        'This delivery mode is not available for this offering',
      );
    }
    return quote;
  }

  private async resolveTutorOffering(
    tutorId: number,
    offeringId: number,
  ): Promise<TutorOfferingEntity> {
    const relations = ['tutor', 'tutor.user', 'tutor.addresses', 'offering'] as const;
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

  private assertOfflineBookingAllowed(
    student: Student,
    tutorOffering: TutorOfferingEntity,
  ): void {
    const tutor = tutorOffering.tutor;
    if (!tutor) {
      throw new BadRequestException('Tutor not found');
    }
    const distanceKm = distanceKmBetweenStudentAndTutor(
      student.addresses ?? [],
      tutor.addresses ?? [],
    );
    if (!isWithinOfflineBookingDistance(distanceKm)) {
      throw new BadRequestException(
        distanceKm == null
          ? 'Add your location to your profile to book offline classes, or choose online.'
          : `Offline classes are available only within ${OFFLINE_BOOKING_MAX_DISTANCE_KM} km of the tutor (${distanceKm.toFixed(1)} km away). Choose online or find a closer tutor.`,
      );
    }
  }

  private requireQuantity(quantity: number): number {
    const qty = Math.floor(Number(quantity));
    if (!Number.isFinite(qty) || qty < 1 || qty > 50) {
      throw new BadRequestException('Choose between 1 and 50 classes');
    }
    return qty;
  }

  private async toCartDtoWithCatalog(
    cart: StudentCartEntity,
  ): Promise<StudentCartDto> {
    const offeringsById = await this.loadOfferingsById();
    const liveItems = (cart.items ?? []).filter((item) => !item.deleted);
    const items = [];
    for (const item of liveItems) {
      const dto = this.toItemDto(item, offeringsById);
      const offering =
        item.tutorOffering ??
        (await this.tutorOfferingRepo.findOne({
          where: { id: item.tutorOfferingId, deleted: false },
        }));
      const rateCards = offering
        ? await this.rateCardService.resolveCompleteRateCards([offering])
        : new Map();
      const rateCard = offering ? (rateCards.get(offering.id) ?? null) : null;
      const quote = rateCard
        ? quoteClassPack(rateCard, item.deliveryMode, item.quantity)
        : null;
      const nudge = rateCard
        ? bulkDiscountNudge(
            classPackSlabLinesForMode(rateCard, item.deliveryMode),
            item.quantity,
          )
        : null;
      items.push({
        ...dto,
        discountPct: quote?.discountPct ?? 0,
        savingsInr: quote?.savingsInr ?? 0,
        discountNudge: nudge?.message ?? null,
      });
    }
    return {
      id: cart.id,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      totalInr: items.reduce((sum, item) => sum + item.lineTotalInr, 0),
    };
  }

  private async loadOfferingsById(): Promise<Map<number, OfferingNodeForLabel>> {
    const catalog = await this.offeringService.findAll();
    return offeringsByIdFromCatalog(catalog);
  }

  private toItemDto(
    item: StudentCartItemEntity,
    offeringsById: Map<number, OfferingNodeForLabel>,
  ): StudentCartItemDto {
    const offering = item.tutorOffering;
    const { offeringId, offeringLabel } = resolveStudentCartOfferingDisplay(
      item.catalogOfferingId,
      offering?.offeringId,
      offering?.offering?.displayName,
      offeringsById,
    );
    return {
      id: item.id,
      tutorId: offering?.tutorId ?? 0,
      tutorOfferingId: item.tutorOfferingId,
      offeringId,
      tutorName: personName(offering?.tutor?.user) || 'Tutor',
      offeringLabel,
      deliveryMode: item.deliveryMode,
      quantity: item.quantity,
      unitRateInr: item.unitRateInr,
      lineTotalInr: item.unitRateInr * item.quantity,
      discountPct: 0,
      savingsInr: 0,
      discountNudge: null,
    };
  }
}
