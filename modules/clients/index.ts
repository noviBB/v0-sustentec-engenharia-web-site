/**
 * Public surface of the clients (cadastral) feature module.
 *
 * Consumers import the server action and row/result TYPES from here; the
 * repository, service, schema, and controller internals stay private to the
 * module. Old `@/lib/*` paths keep working via thin re-export shims.
 */
export { updateClientAction } from '@/modules/clients/clients.controller';
export type { ClientCadastralResult } from '@/modules/clients/client.schema';
export type { Client } from '@/modules/clients/clients.repo';
