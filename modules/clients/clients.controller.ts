'use server';
import 'server-only';

import { requireClient } from '@/lib/auth/tenant';
import { ResultCode } from '@/lib/constants/result-codes';
import {
  clientCadastralSchema,
  type ClientCadastralResult,
} from '@/modules/clients/client.schema';
import { updateClientCadastral } from '@/modules/clients/clients.service';

/**
 * Server action — patches the signed-in user's tenant cadastral fields.
 *
 * Thin controller: Zod-validates the input, resolves the caller's tenant
 * via `requireClient()`, delegates the single unit of work to
 * `updateClientCadastral`, then maps the service's domain `kind` onto the
 * wire-level `ResultCode`. Unauthorized callers (no session OR no tenant
 * link) collapse to one code — the difference isn't actionable in the UI.
 *
 * Both the UPDATE and the audit-log INSERT run under the caller's RLS
 * session inside the service — the audit row is bound to the same
 * `auth.uid()` the policy checks against.
 */
export async function updateClientAction(
  input: unknown,
): Promise<ClientCadastralResult> {
  const parsed = clientCadastralSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: ResultCode.Validation };
  }

  const ctx = await requireClient();
  if (!ctx.ok) {
    return { ok: false, code: ResultCode.Unauthorized };
  }

  const result = await updateClientCadastral({
    session: ctx.session,
    client: ctx.client,
    actorId: ctx.user.id,
    patch: parsed.data,
  });

  switch (result.kind) {
    case 'ok':
      return { ok: true };
    case 'not_found':
      return { ok: false, code: ResultCode.NotFound };
    case 'error':
      return { ok: false, code: ResultCode.ServerError, ref: result.ref };
  }
}
