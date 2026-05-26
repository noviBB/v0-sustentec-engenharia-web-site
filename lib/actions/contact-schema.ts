import { z } from 'zod';

/**
 * Shared Zod schema for the marketing contact form.
 *
 * This file is intentionally separate from `contact.ts` (which is
 * `"use server"`) so the schema can be imported by client components for
 * use with `@hookform/resolvers/zod` without dragging in any server-only
 * code or violating the server-actions-only-exports-functions rule.
 */
export const contactSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(320),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  message: z.string().trim().min(5).max(5000),
});

export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;

export type ContactSubmissionResult =
  | { ok: true }
  | { ok: false; code: 'validation' | 'rate_limited' | 'server_error' };
