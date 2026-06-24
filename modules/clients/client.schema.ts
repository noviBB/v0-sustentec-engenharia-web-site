import { z } from 'zod';

import type { ResultCode } from '@/lib/constants/result-codes';

/**
 * Shared Zod schema for the portal "Dados Cadastrais" edit form.
 *
 * Mirrors the pattern in `lib/schemas/contact.ts`: this file is plain ESM
 * (no `'use server'`, no `import 'server-only'`) so it can be imported by
 * both the server action and the client form via
 * `@hookform/resolvers/zod` without dragging in server-only code.
 *
 * Error messages are translation keys (resolved via `t()` in the UI).
 */
export const clientCadastralSchema = z.object({
  contact_name: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  contact_role: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  contact_email: z
    .string()
    .trim()
    .max(320)
    .optional()
    .or(z.literal(''))
    // Empty strings collapse to undefined; otherwise must look like an email.
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine(
      (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      'portal.dados.validation.invalidEmail',
    ),
  contact_phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  address_street: z
    .string()
    .trim()
    .max(300)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  address_city: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  address_state: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  address_postal_code: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type ClientCadastralInput = z.infer<typeof clientCadastralSchema>;

export type ClientCadastralResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | ResultCode.Validation
        | ResultCode.Unauthorized
        | ResultCode.NotFound
        | ResultCode.ServerError;
      ref?: string;
    };
