'use server';

import { randomUUID } from 'node:crypto';

import { requireClient } from '@/lib/auth/tenant';
import { AuditAction, AuditEvent } from '@/lib/constants/audit-events';
import { ResultCode } from '@/lib/constants/result-codes';
import { insertAuditLog } from '@/lib/db/auditLog';
import { updateClient } from '@/lib/db/clients';
import {
  clientCadastralSchema,
  type ClientCadastralResult,
} from '@/lib/schemas/client';

/**
 * Server action — patches the signed-in user's tenant cadastral fields.
 *
 * Mirrors `submitContact`: validates with the shared Zod schema, calls the
 * data-access helper, writes an audit log row, returns a typed result.
 * Unauthorized callers (no session OR no tenant link) are collapsed into a
 * single `unauthorized` code — the difference isn't actionable in the UI.
 *
 * Both the UPDATE and the audit-log INSERT run under the caller's RLS
 * session — the audit row is bound to the same `auth.uid()` the policy
 * checks against.
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

  try {
    const updated = await updateClient(ctx.session, ctx.client.id, parsed.data);
    if (!updated) {
      return { ok: false, code: ResultCode.NotFound };
    }

    await insertAuditLog(
      {
        action: AuditAction.ClientUpdated,
        entity_type: 'client',
        entity_id: ctx.client.id,
        actor_id: ctx.user.id,
        before: {
          contact_name: ctx.client.contact_name,
          contact_role: ctx.client.contact_role,
          contact_email: ctx.client.contact_email,
          contact_phone: ctx.client.contact_phone,
          address_street: ctx.client.address_street,
          address_city: ctx.client.address_city,
          address_state: ctx.client.address_state,
          address_postal_code: ctx.client.address_postal_code,
        },
        after: parsed.data,
      },
      { mode: 'rls', session: ctx.session },
    );

    return { ok: true };
  } catch (err) {
    const ref = randomUUID().slice(0, 8);
    console.error(
      JSON.stringify({
        event: AuditEvent.ClientUpdateFailed,
        ref,
        clientId: ctx.client.id,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return { ok: false, code: ResultCode.ServerError, ref };
  }
}
