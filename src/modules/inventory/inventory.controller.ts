import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { AccessTokenPayload } from '../../auth/auth.types';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Post('movements')
  @Roles('OWNER', 'MANAGER', 'OPERATOR')
  move(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string, @Body() dto: CreateStockMovementDto) {
    return this.inventory.move(user.tenantId, storeId, user.sub, dto);
  }

  @Get('products/:productId/balance')
  balance(@CurrentUser() user: AccessTokenPayload, @Headers('x-store-id') storeId: string, @Param('productId') productId: string) {
    return this.inventory.balance(user.tenantId, storeId, productId);
  }
}
