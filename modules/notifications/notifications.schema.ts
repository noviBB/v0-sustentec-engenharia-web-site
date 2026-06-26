import { z } from 'zod';

/**
 * Zod schemas for the notifications module's writes.
 *
 * Plain ESM (no `'use server'`, no `import 'server-only'`) so it can be shared
 * by the server action and any client-side validation without dragging in
 * server-only code.
 */
export const markProcessPendenciasSeenSchema = z.object({
  processId: z.string().uuid(),
});

export type MarkProcessPendenciasSeenInput = z.infer<
  typeof markProcessPendenciasSeenSchema
>;
