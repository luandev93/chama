import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { AccessTokenPayload } from '../../auth/auth.types';
import { CashPaymentDto, CreatePaymentDto, RefundPaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('orders/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'OPERATOR')
  create(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string, @Param('orderId') orderId: string, @Body() dto: CreatePaymentDto) {
    return this.payments.create(user.tenantId, storeId, orderId, user.sub, dto);
  }

  @Post('orders/:orderId/cash')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'OPERATOR')
  cash(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string, @Param('orderId') orderId: string, @Body() dto: CashPaymentDto) {
    return this.payments.registerCashPayment(user.tenantId, storeId, orderId, user.sub, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  get(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string, @Param('id') id: string) {
    return this.payments.get(user.tenantId, storeId, id);
  }

  @Get('orders/:orderId/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  listForOrder(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string, @Param('orderId') orderId: string) {
    return this.payments.listForOrder(user.tenantId, storeId, orderId);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER', 'OPERATOR')
  cancel(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string, @Param('id') id: string) {
    return this.payments.cancel(user.tenantId, storeId, id, user.sub);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'MANAGER')
  refund(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string, @Param('id') id: string, @Body() dto: RefundPaymentDto) {
    return this.payments.refund(user.tenantId, storeId, id, user.sub, dto);
  }

  @Post('webhooks/mercado-pago')
  webhook(
    @Headers('x-signature') xSignature: string | undefined,
    @Headers('x-request-id') xRequestId: string | undefined,
    @Query('data.id') dataId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.payments.handleMercadoPagoWebhook({ xSignature, xRequestId }, dataId, body ?? {});
  }
}
