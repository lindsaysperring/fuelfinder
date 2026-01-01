import { PrismaClient } from '@/generated/client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { logger } from '@/lib/utils/logger';

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  // Get the database URL from environment
  const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
  
  // Create the adapter with the URL
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
};

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Graceful shutdown
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    logger.info('Disconnecting Prisma client...');
    await prisma.$disconnect();
  });
}
