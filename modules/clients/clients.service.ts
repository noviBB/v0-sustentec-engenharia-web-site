import { randomUUID } from 'node:crypto';

import { AuditAction, AuditEvent } from '@/lib/constants/audit-events';
import { insertAuditLog } from '@/lib/db/auditLog';
import type { SessionLike } from '@/lib/db';
import type { Client } from '@/modules/clients/clients.repo';
import {
  updateClient,
  type ClientCadastralUpdate,
} from '@/modules/clients/clients.repo';

/**
 * Domain result for the cadastral-update orchestration. Carries no
 * `ResultCode` — that mapping is the controller's job. `ref` is the short
 * correlation id emitted alongside the structured error log on failure.
 */
export type UpdateClientCadastralResult =
  | { kind: 'ok' }
  | { kind: 'not_found' }
  | { kind: 'error'; ref: string };

export interface UpdateClientCadastralArgs {
  /** RLS session of the signed-in caller; both the UPDATE and the audit
   *  INSERT run under it so the audit row is bound to the same `auth.uid()`
   *  the `clients` RLS policy checks. */
  session: SessionLike;
  /** The caller's current tenant row — its values seed the audit `before`. */
  client: Client;
  /** `auth.uid()` of the actor, written to `audit_log.actor_id`. */
  actorId: string;
  /** Validated cadastral patch (already Zod-parsed by the controller). */
  patch: ClientCadastralUpdate;
}

/**
 * Orchestrates a cadastral update: patches the client row, writes the
 * before/after audit-log diff, and returns a domain result.
 *
 * Pure orchestration — no `'use server'`, no `next/*`, no Supabase, no
 * `ResultCode`. The controller adapts the returned `kind` to the wire
 * contract. The `randomUUID` correlation ref and the `console.error` on
 * failure live here so the failure path is fully owned by the service.
 */
export async function updateClientCadastral({
  session,
  client,
  actorId,
  patch,
}: UpdateClientCadastralArgs): Promise<UpdateClientCadastralResult> {
  try {
    const updated = await updateClient(session, client.id, patch);
    if (!updated) {
      return { kind: 'not_found' };
    }

    await insertAuditLog(
      {
        action: AuditAction.ClientUpdated,
        entity_type: 'client',
        entity_id: client.id,
        actor_id: actorId,
        before: {
          contact_name: client.contact_name,
          contact_role: client.contact_role,
          contact_email: client.contact_email,
          contact_phone: client.contact_phone,
          address_street: client.address_street,
          address_city: client.address_city,
          address_state: client.address_state,
          address_postal_code: client.address_postal_code,
        },
        after: patch,
      },
      { mode: 'rls', session },
    );

    return { kind: 'ok' };
  } catch (err) {
    const ref = randomUUID().slice(0, 8);
    console.error(
      JSON.stringify({
        event: AuditEvent.ClientUpdateFailed,
        ref,
        clientId: client.id,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return { kind: 'error', ref };
  }
}
