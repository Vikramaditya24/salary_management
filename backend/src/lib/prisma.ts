import { PrismaClient } from '../generated/prisma/index.js';
import { env } from '../config/env.js';

// A single shared PrismaClient instance for the process. Re-created only in
// tests via separate wiring if ever needed — for the app itself, one
// singleton avoids exhausting DB connections across hot reloads.
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
