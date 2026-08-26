import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { StockReservationService } from './stock-reservation.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, StockReservationService],
  exports: [InventoryService, StockReservationService],
})
export class InventoryModule {}
