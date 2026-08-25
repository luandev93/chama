import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth() {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return { status: 'ok', service: 'chama-api', database: 'ok' };
    } catch {
      throw new ServiceUnavailableException({ status: 'degraded', service: 'chama-api', database: 'unavailable' });
    }
  }
}
