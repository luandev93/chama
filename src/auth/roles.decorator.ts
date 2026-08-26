import { SetMetadata } from '@nestjs/common';
import { ChamaRole } from './auth.types';

export const ROLES_KEY = 'chama_roles';
export const Roles = (...roles: ChamaRole[]) => SetMetadata(ROLES_KEY, roles);
