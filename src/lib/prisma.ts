import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

/**
 * Resolves the database connection URL.
 * Automatically handles:
 * 1. Explicit DATABASE_URL from hosting platform environment variables (e.g. PostgreSQL, Supabase, Neon).
 * 2. Vercel / AWS Lambda serverless read-only filesystem by safely copying SQLite db to writable /tmp.
 * 3. Default local SQLite dev.db fallback.
 */
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Handle serverless / Vercel environments where /var/task is read-only
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDb = '/tmp/dev.db';
    try {
      if (!fs.existsSync(tmpDb)) {
        const localDb = path.join(process.cwd(), 'prisma', 'dev.db');
        if (fs.existsSync(localDb)) {
          fs.copyFileSync(localDb, tmpDb);
        }
      }
      return `file:${tmpDb}`;
    } catch (err) {
      console.error('[PRISMA] Error initializing /tmp SQLite db for serverless:', err);
    }
  }

  return 'file:./dev.db';
}

// Ensure DATABASE_URL is defined early in environment
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const resolvedDbUrl = resolveDatabaseUrl();
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'file:./dev.db') {
  process.env.DATABASE_URL = resolvedDbUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: resolvedDbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

