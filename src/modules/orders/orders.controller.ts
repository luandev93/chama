import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { AccessTokenPayload } from '../../auth/auth.types';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @Roles('OWNER', 'MANAGER', 'OPERATOR')
  create(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.tenantId, storeId, user.sub, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string, @Param('id') id: string) {
    return this.orders.get(user.tenantId, storeId, id);
  }

  @Post(':id/cancel')
  @Roles('OWNER', 'MANAGER', 'OPERATOR')
  cancel(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string, @Param('id') id: string) {
    return this.orders.cancel(user.tenantId, storeId, user.sub, id);
  }
}
