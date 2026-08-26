import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessTokenPayload } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessTokenPayload => {
    return context.switchToHttp().getRequest().user as AccessTokenPayload;
  },
);
