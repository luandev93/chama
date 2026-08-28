import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { AccessTokenPayload } from '../../auth/auth.types';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateStockReservationDto } from './dto/create-stock-reservation.dto';
import { CreateProductLotDto } from './dto/create-product-lot.dto';
import { InventoryService } from './inventory.service';
import { StockReservationService } from './stock-reservation.service';
@Controller('inventory') @UseGuards(JwtAuthGuard,RolesGuard)
export class InventoryController{constructor(private readonly inventory:InventoryService,private readonly reservations:StockReservationService){}
@Post('movements') @Roles('OWNER','MANAGER','OPERATOR') move(@CurrentUser() user:AccessTokenPayload,@Headers('x-store-id') storeId:string,@Body() dto:CreateStockMovementDto){return this.inventory.move(user.tenantId,storeId,user.sub,dto)}
@Post('lots') @Roles('OWNER','MANAGER','OPERATOR') createLot(@CurrentUser() user:AccessTokenPayload,@Headers('x-store-id') storeId:string,@Body() dto:CreateProductLotDto){return this.inventory.createLot(user.tenantId,storeId,user.sub,dto)}
@Get('products/:productId/lots') listLots(@CurrentUser() user:AccessTokenPayload,@Headers('x-store-id') storeId:string,@Param('productId') productId:string){return this.inventory.listLots(user.tenantId,storeId,productId)}
@Get('alerts') alerts(@CurrentUser() user:AccessTokenPayload,@Headers('x-store-id') storeId:string){return this.inventory.alerts(user.tenantId,storeId)}
@Get('promotion-suggestions') @Roles('OWNER','MANAGER') promotionSuggestions(@CurrentUser() user:AccessTokenPayload,@Headers('x-store-id') storeId:string){return this.inventory.promotionSuggestions(user.tenantId,storeId)}
@Post('reservations') @Roles('OWNER','MANAGER','OPERATOR') reserve(@CurrentUser() user:AccessTokenPayload,@Headers('x-store-id') storeId:string,@Body() dto:CreateStockReservationDto){return this.reservations.create(user.tenantId,storeId,user.sub,dto)}
@Post('reservations/:id/release') @Roles('OWNER','MANAGER','OPERATOR') release(@CurrentUser() user:AccessTokenPayload,@Headers('x-store-id') storeId:string,@Param('id') id:string){return this.reservations.release(user.tenantId,storeId,user.sub,id)}
@Get('products/:productId/balance') balance(@CurrentUser() user:AccessTokenPayload,@Headers('x-store-id') storeId:string,@Param('productId') productId:string){return this.inventory.balance(user.tenantId,storeId,productId)}}
