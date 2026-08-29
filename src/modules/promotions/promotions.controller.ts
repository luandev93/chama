import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PromotionStatus } from '@prisma/client';
import { PromotionsService } from './promotions.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
@Controller('promotions') @UseGuards(JwtAuthGuard)
export class PromotionsController{constructor(private readonly promotions:PromotionsService){}
@Get() list(@CurrentUser() user:any){return this.promotions.list(user.tenantId,user.storeId)}
@Get('commercial-suggestions') suggestions(@CurrentUser() user:any){return this.promotions.commercialSuggestions(user.tenantId,user.storeId)}
@Post() create(@CurrentUser() user:any,@Body() dto:any){return this.promotions.create(user.tenantId,user.storeId,user.id,dto)}
@Post(':id/status') status(@CurrentUser() user:any,@Param('id') id:string,@Body('status') status:PromotionStatus){return this.promotions.setStatus(user.tenantId,user.storeId,user.id,id,status)}}
