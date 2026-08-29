import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { DashboardService } from './dashboard.service';
@Controller('dashboard') @UseGuards(JwtAuthGuard) export class DashboardController{constructor(private readonly dashboard:DashboardService){} @Get('overview') overview(@CurrentUser() user:any){return this.dashboard.overview(user.tenantId,user.storeId)}}
