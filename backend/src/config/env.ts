import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  HR_EMAIL: z.string().email().default('hr@acme.example'),
  HR_PASSWORD_HASH: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  if (parsed.data.NODE_ENV === 'production' && !parsed.data.HR_PASSWORD_HASH) {
    throw new Error('HR_PASSWORD_HASH is required in production.');
  }
  return parsed.data;
}

export const env = loadEnv();
