import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  AUTH_URL: z.string().url().optional(),
  MAKE_SHARED_SECRET: z.string().min(8),
  APP_BASE_URL: z.string().url(),

  MAKE_WEBHOOK_META_CONNECT: z.string().url().optional().or(z.literal("")),
  MAKE_WEBHOOK_META_LIST_ADACCOUNTS: z.string().url().optional().or(z.literal("")),
  MAKE_WEBHOOK_META_INSIGHTS: z.string().url().optional().or(z.literal("")),
  MAKE_WEBHOOK_CAMPAIGN_LIST: z.string().url().optional().or(z.literal("")),
  MAKE_WEBHOOK_CAMPAIGN_CREATE: z.string().url().optional().or(z.literal("")),
  MAKE_WEBHOOK_CAMPAIGN_UPDATE: z.string().url().optional().or(z.literal("")),
  MAKE_WEBHOOK_ADSET_LIST: z.string().url().optional().or(z.literal("")),
  MAKE_WEBHOOK_ADSET_CREATE: z.string().url().optional().or(z.literal("")),
  MAKE_WEBHOOK_AD_LIST: z.string().url().optional().or(z.literal("")),
  MAKE_WEBHOOK_AD_CREATE: z.string().url().optional().or(z.literal("")),
  MAKE_WEBHOOK_CREATIVE_CREATE: z.string().url().optional().or(z.literal("")),
  MAKE_WEBHOOK_IMAGE_UPLOAD: z.string().url().optional().or(z.literal("")),
  MAKE_WEBHOOK_VIDEO_UPLOAD: z.string().url().optional().or(z.literal("")),
});

export const env = EnvSchema.parse(process.env);
