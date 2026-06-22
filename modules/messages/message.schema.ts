import { z } from 'zod';

/**
 * Input validation for the mark-read action. The action takes a single
 * message id, which must be a UUID — anything else is rejected before any
 * auth/DB work, and the controller maps a parse failure to a domain-level
 * "not found" (we don't leak the difference between malformed and absent).
 */
export const markMessageReadSchema = z.object({
  messageId: z.string().uuid(),
});

export type MarkMessageReadInput = z.infer<typeof markMessageReadSchema>;
