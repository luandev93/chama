import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../core/database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { AccessTokenPayload, ChamaRole } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async registerOwner(dto: RegisterOwnerDto) {
    const tenantSlug = dto.tenantSlug.toLowerCase();
    const storeSlug = dto.storeSlug.toLowerCase();
    const existing = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (existing) throw new ConflictException('Este identificador de empresa já está em uso.');

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: dto.tenantName.trim(), slug: tenantSlug } });
      const store = await tx.store.create({ data: { tenantId: tenant.id, name: dto.storeName.trim(), slug: storeSlug } });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          displayName: dto.displayName.trim(),
          role: 'OWNER',
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorId: user.id,
          action: 'CREATE',
          entityType: 'TenantBootstrap',
          entityId: tenant.id,
          after: { tenantId: tenant.id, storeId: store.id, userId: user.id },
        },
      });
      return { tenant, store, user };
    });

    return this.issueTokens(result.user.id, result.tenant.id, result.user.role as ChamaRole);
  }

  async login(dto: LoginDto) {
    const users = await this.prisma.user.findMany({ where: { email: dto.email }, take: 2 });
    const user = users[0];
    if (!user || user.status !== 'ACTIVE' || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    return this.issueTokens(user.id, user.tenantId, user.role as ChamaRole);
  }

  async refresh(refreshToken: string) {
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    const session = await this.prisma.authSession.findUnique({ where: { refreshTokenHash: hash } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Sessão expirada ou inválida.');
    }
    await this.prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Sessão inválida.');
    return this.issueTokens(user.id, user.tenantId, user.role as ChamaRole);
  }

  async logout(sessionId: string) {
    await this.prisma.authSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async me(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, tenantId: true, email: true, displayName: true, role: true, status: true, mfaEnabled: true },
    });
    if (!user) throw new UnauthorizedException('Usuário não encontrado.');
    return user;
  }

  private async issueTokens(userId: string, tenantId: string, role: ChamaRole) {
    const sessionId = randomBytes(24).toString('hex');
    const payload: AccessTokenPayload = { sub: userId, tenantId, role, sessionId };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
      issuer: this.config.getOrThrow<string>('JWT_ISSUER'),
      audience: this.config.getOrThrow<string>('JWT_AUDIENCE'),
    });
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.authSession.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900 };
  }
}
