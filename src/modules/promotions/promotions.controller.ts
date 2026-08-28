import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PromotionStatus } from '@prisma/client';
import { PromotionsService } from './promotions.service';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { StoreId } from '../../core/tenancy/store-id.decorator';
import { Roles } from '../../core/rbac/roles.decorator';
import { RolesGuard } from '../../core/rbac/roles.guard';
@Controller('promotions') @UseGuards(JwtAccessGuard,RolesGuard)
export class PromotionsController{constructor(private readonly promotions:PromotionsService){}
@Get() list(@CurrentUser() user:any,@StoreId() storeId:string){return this.promotions.list(user.tenantId,storeId)}
@Get('commercial-suggestions') @Roles('OWNER','MANAGER') suggestions(@CurrentUser() user:any,@StoreId() storeId:string){return this.promotions.commercialSuggestions(user.tenantId,storeId)}
@Post() @Roles('OWNER','MANAGER') create(@CurrentUser() user:any,@StoreId() storeId:string,@Body() dto:any){return this.promotions.create(user.tenantId,storeId,user.id,dto)}
@Post(':id/status') @Roles('OWNER','MANAGER') status(@CurrentUser() user:any,@StoreId() storeId:string,@Param('id') id:string,@Body('status') status:PromotionStatus){return this.promotions.setStatus(user.tenantId,storeId,user.id,id,status)}}
