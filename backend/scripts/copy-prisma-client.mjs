import { cpSync, existsSync } from 'node:fs';

const source = new URL('../src/generated/prisma/', import.meta.url);
const destination = new URL('../dist/generated/prisma/', import.meta.url);

if (!existsSync(source)) {
  throw new Error('Prisma client is missing. Run prisma generate before building.');
}

cpSync(source, destination, { recursive: true, force: true });