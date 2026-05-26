import 'server-only';

import { Client } from '@notionhq/client';

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

interface QueryResponse {
  results: unknown[];
  next_cursor: string | null;
  has_more: boolean;
}

// Simple retry policy for Notion's 429 / 5xx responses.
const MAX_RETRIES = 4;
const BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
}

/**
 * Constructs the Notion client. Throws `NotionTokenMissingError` synchronously
 * when the token is absent — call this only inside a sync, never at import.
 */
export function createNotionClient(token?: string): NotionClient {
  const auth = token ?? process.env.NOTION_INTEGRATION_TOKEN;
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
          e && typeof e === 'object' && 'status' in e
            ? Number((e as { status: unknown }).status)
            : undefined;
        const retryable =
          status === 429 || (status !== undefined && status >= 500);
        if (!retryable || attempt === MAX_RETRIES) throw e;
        const headerDelay =
          e && typeof e === 'object' && 'headers' in e
            ? Number(
                (e as { headers?: Record<string, string> }).headers?.[
                  'retry-after'
                ],
              ) * 1000
            : NaN;
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
      const loose = notion as unknown as {
        dataSources?: {
          query: (a: unknown) => Promise<QueryResponse>;
        };
        databases?: {
          query: (a: unknown) => Promise<QueryResponse>;
        };
      };

      const out: NotionPage[] = [];
      let cursor: string | undefined;
      do {
        const res = await withRetry(() =>
          loose.dataSources?.query
            ? loose.dataSources.query({
                data_source_id: dataSourceId,
                start_cursor: cursor,
                ...(filter ? { filter } : {}),
              })
            : loose.databases!.query({
                database_id: dataSourceId,
                start_cursor: cursor,
                ...(filter ? { filter } : {}),
              }),
        );
        for (const r of res.results) {
          out.push(r as NotionPage);
        }
        cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
      } while (cursor);
      return out;
    },

    async retrievePage(pageId) {
      const res = await withRetry(() =>
        notion.pages.retrieve({ page_id: pageId }),
      );
      return res as unknown as NotionPage;
    },
  };
}
