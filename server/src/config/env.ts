import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/eldercare_ai'),
  JWT_SECRET: z.string().default('eldercare_ai_super_secret_jwt_key_2026_secure'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  LLM_PROVIDER: z.enum(['mock', 'gemini', 'openai']).default('mock'),
  GEMINI_API_KEY: z.string().optional().default(''),
  TELEPHONY_PROVIDER: z.enum(['webrtc', 'mock']).default('webrtc'),
  FAST2SMS_API_KEY: z.string().optional().default(''),
  CLOUDFLARE_TUNNEL_URL: z.string().optional().default(''),
  AUTO_START_TUNNEL: z.enum(['true', 'false']).default('false'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
