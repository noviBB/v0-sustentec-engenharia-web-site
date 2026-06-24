import 'server-only';

import { Client } from '@notionhq/client';

import { config } from '@/lib/config';
import {
  notionQueryResponseSchema,
  parseNotionPage,
} from './schemas';
import { NotionTokenMissingError, type NotionPage } from './types';

/**
 * Thin @notionhq/client wrapper.
 *
 * IMPORTANT: NOTION_INTEGRATION_TOKEN is validated LAZILY — only when a client
 * is actually constructed (i.e. when a sync runs). The token is an external
 * credential that may be absent in CI / at build time. `pnpm build` must
 * succeed with an empty token, so nothing here reads the env at module load.
 */

const NOTION_VERSION = '2022-06-28';

// Simple retry policy for Notion's 429 / 5xx responses.
const MAX_RETRIES = 4;
const BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A loosely-typed Notion SDK method: takes a params object, returns the raw
 * (untyped) REST response. We deliberately model the SDK methods through this
 * single loose contract rather than the SDK's strict discriminated-union
 * parameter types: the read responses are validated by zod downstream, and the
 * write payloads (`updatePage`) are produced by the reverse-mapper and covered
 * by its unit tests. This lets us call the SDK without an `as` cast.
 */
type NotionLooseFn = (arg: Record<string, unknown>) => Promise<unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Type guard narrowing an `unknown` value to our loose SDK-method contract. A
 * runtime `typeof === 'function'` is the strongest check JS allows; the call
 * signature is asserted structurally by the predicate.
 */
function isNotionLooseFn(value: unknown): value is NotionLooseFn {
  return typeof value === 'function';
}

/**
 * Feature-detects `client[namespace][method]` at runtime without an `as` cast.
 * @notionhq v4/v5 expose operations under different namespaces (e.g. `query`
 * under `databases` vs `dataSources`); the SDK types don't model both shapes,
 * so we walk the object graph with `in`/`typeof` guards and return the bound
 * callable when present, or `undefined` when this client version lacks it.
 */
function resolveSdkMethod(
  client: unknown,
  namespace: string,
  method: string,
): NotionLooseFn | undefined {
  if (!isRecord(client)) return undefined;
  const ns = client[namespace];
  if (!isRecord(ns)) return undefined;
  const fn = ns[method];
  if (!isNotionLooseFn(fn)) return undefined;
  // Preserve the namespace as the receiver so the SDK method keeps its `this`.
  return (arg) => fn.call(ns, arg);
}

export interface NotionClient {
  /**
   * Queries a Notion data source, paginating through every page.
   *
   * NOTE: @notionhq/client v5 replaced `databases.query(database_id)` with
   * `dataSources.query(data_source_id)`. We treat `clients.notion_database_id`
   * as the data-source id for v5. (A database may expose multiple data
   * sources; Engeprat's process DB has exactly one.)
   */
  queryDatabaseAll(
    dataSourceId: string,
    filter?: unknown,
  ): Promise<NotionPage[]>;
  /** Retrieves a single page (used to resolve TAREFAS relations). */
  retrievePage(pageId: string): Promise<NotionPage>;
  /**
   * Writes properties back to an existing Notion page (DB -> Notion export).
   * `properties` is the Notion property map produced by `exportToNotion`.
   * Same lazy-token gate as the read methods.
   */
  updatePage(
    pageId: string,
    properties: Record<string, unknown>,
  ): Promise<void>;
}

/**
 * Constructs the Notion client. Throws `NotionTokenMissingError` synchronously
 * when the token is absent — call this only inside a sync, never at import.
 */
export function createNotionClient(token?: string): NotionClient {
  // Lazy: config.server is read only here (at sync time), never at import, so
  // `pnpm build` succeeds with an empty NOTION_INTEGRATION_TOKEN.
  const auth = token ?? config.server.NOTION_INTEGRATION_TOKEN;
  if (!auth || auth.trim().length === 0) {
    throw new NotionTokenMissingError();
  }

  const notion = new Client({ auth, notionVersion: NOTION_VERSION });

  async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        return await fn();
      } catch (e: unknown) {
        lastErr = e;
        const status =
          typeof e === 'object' && e !== null && 'status' in e
            ? Number(e.status)
            : undefined;
        const retryable =
          status === 429 || (status !== undefined && status >= 500);
        if (!retryable || attempt === MAX_RETRIES) throw e;
        const retryAfter =
          typeof e === 'object' &&
          e !== null &&
          'headers' in e &&
          typeof e.headers === 'object' &&
          e.headers !== null &&
          'retry-after' in e.headers
            ? e.headers['retry-after']
            : undefined;
        const headerDelay = Number(retryAfter) * 1000;
        const delay = Number.isFinite(headerDelay)
          ? headerDelay
          : BASE_DELAY_MS * 2 ** attempt;
        await sleep(delay);
      }
    }
    throw lastErr;
  }

  return {
    async queryDatabaseAll(dataSourceId, filter) {
      // v5 surface: dataSources.query({ data_source_id }). Older majors used
      // databases.query({ database_id }); fall back if dataSources is absent.
      // The SDK's types don't model both namespaces, so we feature-detect via
      // runtime guards over a `Record<string, unknown>` view of the client. The
      // response is validated by notionQueryResponseSchema below.
      const dataSourcesQuery = resolveSdkMethod(notion, 'dataSources', 'query');
      const databasesQuery = resolveSdkMethod(notion, 'databases', 'query');

      const out: NotionPage[] = [];
      let cursor: string | undefined;
      do {
        const raw = await withRetry(() =>
          dataSourcesQuery
            ? dataSourcesQuery({
                data_source_id: dataSourceId,
                start_cursor: cursor,
                ...(filter ? { filter } : {}),
              })
            : databasesQuery
              ? databasesQuery({
                  database_id: dataSourceId,
                  start_cursor: cursor,
                  ...(filter ? { filter } : {}),
                })
              : (() => {
                  throw new Error(
                    'Notion client exposes neither dataSources.query nor databases.query',
                  );
                })(),
        );
        const res = notionQueryResponseSchema.parse(raw);
        for (const r of res.results) {
          out.push(parseNotionPage(r));
        }
        cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
      } while (cursor);
      return out;
    },

    async retrievePage(pageId) {
      const res = await withRetry(() =>
        notion.pages.retrieve({ page_id: pageId }),
      );
      return parseNotionPage(res);
    },

    async updatePage(pageId, properties) {
      // `pages.update`'s `properties` param is a strict discriminated union over
      // every Notion property kind; our reverse-mapper emits a loose
      // Record<string, unknown> (covered by its own unit tests). We invoke the
      // SDK method through the loose contract so no `as` cast is needed.
      const update = resolveSdkMethod(notion, 'pages', 'update');
      if (!update) {
        throw new Error('Notion client does not expose pages.update');
      }
      await withRetry(() =>
        update({
          page_id: pageId,
          properties,
        }),
      );
    },
  };
}
