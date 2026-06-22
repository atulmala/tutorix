import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { NotFoundException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { CommerceOrderDto } from '../dto/commerce-order.dto';
import { InvoiceSummaryDto } from '../dto/invoice-summary.dto';
import { OrderService } from '../services/order.service';
import { InvoiceService } from '../services/invoice.service';

@Resolver()
export class CommerceResolver {
  constructor(
    private readonly orderService: OrderService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Query(() => CommerceOrderDto, {
    description: 'Fetch a commerce order belonging to the current user',
  })
  @UseGuards(JwtAuthGuard)
  async myOrder(
    @CurrentUser() user: User,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<CommerceOrderDto> {
    const order = await this.orderService.findByIdForUser(id, user.id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.orderService.toDto(order);
  }

  @Query(() => InvoiceSummaryDto, {
    nullable: true,
    description: 'Invoice for a commerce order belonging to the current user',
  })
  @UseGuards(JwtAuthGuard)
  async myOrderInvoice(
    @CurrentUser() user: User,
    @Args('orderId', { type: () => Int }) orderId: number,
  ): Promise<InvoiceSummaryDto | null> {
    const order = await this.orderService.findByIdForUser(orderId, user.id);
    if (!order) {
      return null;
    }
    const invoice = await this.invoiceService.findByOrderId(order.id);
    if (!invoice) {
      return null;
    }
    return this.invoiceService.toSummaryDto(invoice);
  }
}
