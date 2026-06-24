import { z } from 'zod';

import type { ResultCode } from '@/lib/constants/result-codes';

/**
 * Zod schema for creating an appointment via the scheduling form.
 *
 * Error messages are translation keys (resolved via `t()` in the UI) so they
 * stay aligned with the `pt`/`en` dictionaries in
 * `lib/language-context.tsx`.
 */
export const createAppointmentSchema = z.object({
  responsible_tech_id: z
    .string()
    .uuid('portal.appointment.validation.techRequired'),
  // ISO timestamp (UTC). Form sends `<input type="hidden">` derived from a
  // date + time pair via `new Date(...).toISOString()` on the client.
  scheduled_for: z
    .string()
    .datetime({ offset: true, message: 'portal.appointment.validation.slotRequired' }),
  subject: z
    .string()
    .trim()
    .min(2, 'portal.appointment.validation.subjectRequired')
    .max(200, 'portal.appointment.validation.subjectRequired'),
  notes: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export type CreateAppointmentResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code:
        | ResultCode.Validation
        | ResultCode.Unauthorized
        | ResultCode.DoubleBooked
        | ResultCode.ServerError;
      ref?: string;
    };
