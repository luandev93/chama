import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaService } from './core/database/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      const allowlist = (process.env.CORS_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
      if (!origin || allowlist.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');

  // Raw alias outside the /api prefix: the deploy platform's health check path
  // is configured independently of the app and has drifted before (/health vs
  // /api/health). Serving both removes that class of false-negative deploy failure.
  const prisma = app.get(PrismaService);
  app.getHttpAdapter().get('/health', async (_req: any, res: any) => {
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      res.status(200).json({ status: 'ok', service: 'chama-api', database: 'ok' });
    } catch {
      res.status(503).json({ status: 'degraded', service: 'chama-api', database: 'unavailable' });
    }
  });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
