import { OrderStatus } from '@prisma/client';

// Orders in these statuses represent real, counted sales for reporting (dashboard, brand and
// product rankings). DRAFT/PENDING_PAYMENT haven't happened yet; CANCELLED/EXPIRED didn't happen.
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];
