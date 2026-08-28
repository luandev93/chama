import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { StoreId } from '../../core/tenancy/store-id.decorator';
import { Roles } from '../../core/rbac/roles.decorator';
import { RolesGuard } from '../../core/rbac/roles.guard';
import { DashboardService } from './dashboard.service';
@Controller('dashboard') @UseGuards(JwtAccessGuard,RolesGuard) export class DashboardController{constructor(private readonly dashboard:DashboardService){} @Get('overview') @Roles('OWNER','MANAGER') overview(@CurrentUser() user:any,@StoreId() storeId:string){return this.dashboard.overview(user.tenantId,storeId)}}
