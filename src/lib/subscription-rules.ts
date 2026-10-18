import { z } from "zod";

export const SUBSCRIPTION_DAYS = [0, 1, 2, 3, 4] as const;
export const subscriptionDaysSchema = z.array(z.number().int().min(0).max(4))
  .min(2, "Please select between 2 and 5 days.")
  .max(5, "Please select between 2 and 5 days.")
  .refine((days) => new Set(days).size === days.length, "Delivery days must be unique.");
export const subscriptionRequestSchema = z.object({
  billing_period: z.enum(["weekly", "monthly"]),
  default_days: subscriptionDaysSchema,
}).transform((request) => ({ ...request, default_days: [...request.default_days].sort((a, b) => a - b), days_per_week: request.default_days.length }));
