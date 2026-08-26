export type ChamaRole = 'OWNER' | 'MANAGER' | 'OPERATOR' | 'DELIVERY_DRIVER';

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  role: ChamaRole;
  sessionId: string;
}
