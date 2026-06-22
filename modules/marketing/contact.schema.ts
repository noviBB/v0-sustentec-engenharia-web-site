import { z } from 'zod';

import { ResultCode } from '@/lib/constants/result-codes';

/**
 * Shared Zod schema for the marketing contact form.
 *
 * This file lives under `lib/schemas/` (NOT `lib/actions/`) so it can be
 * imported by client components for use with `@hookform/resolvers/zod`
 * without dragging in any server-only code or violating the
 * server-actions-only-exports-functions rule.
 *
 * Error messages are translation keys (resolved via `t()` in the UI), so
 * they remain in sync with the `pt` / `en` dictionaries in
 * `lib/language-context.tsx`.
 */
export const contactSubmissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'contact.validation.nameRequired')
    .max(200, 'contact.validation.nameRequired'),
  email: z
    .string()
    .trim()
    .email('contact.validation.emailInvalid')
    .max(320, 'contact.validation.emailInvalid'),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  message: z
    .string()
    .trim()
    .min(5, 'contact.validation.messageRequired')
    .max(5000, 'contact.validation.messageRequired'),
});

export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;

export type ContactSubmissionResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | ResultCode.Validation
        | ResultCode.RateLimited
        | ResultCode.ServerError;
      ref?: string;
    };
