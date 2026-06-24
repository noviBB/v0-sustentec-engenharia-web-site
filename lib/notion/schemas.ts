import { z } from 'zod';

import type { NotionPage, NotionPropertyValue } from './types';

/**
 * Shared zod schemas for validating untrusted Notion-shaped JSON at the
 * adapter boundary — the Notion REST API responses and the inbound webhook
 * payload. These replace ad-hoc `as`/`as unknown as` casts so the boundary
 * is checked at runtime, not just asserted at compile time.
 *
 * The schemas are intentionally LOOSE: Notion's property payloads are an open,
 * versioned discriminated union, and the per-property parsers in `parsers.ts`
 * already validate the inner shape and degrade gracefully. Here we only assert
 * the structural envelope we depend on (`id` + `properties` map) and pass the
 * property values through untouched.
 */

// ---------------------------------------------------------------------------
// Notion page envelope (REST: dataSources.query results, pages.retrieve)
// ---------------------------------------------------------------------------

/** A single Notion property value — `{ id?, type?, ...payload }`, read loosely. */
export const notionPropertyValueSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

/** Minimal Notion page envelope: the `id` + `properties` map we depend on. */
export const notionPageSchema = z
  .object({
    id: z.string(),
    last_edited_time: z.string().optional(),
    properties: z.record(notionPropertyValueSchema).default({}),
  })
  .passthrough();

/** Paginated query response shape from dataSources.query / databases.query. */
export const notionQueryResponseSchema = z.object({
  results: z.array(z.unknown()),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
});

/**
 * Parses an unknown REST value into a `NotionPage`. Throws a ZodError when the
 * envelope is malformed — callers turn that into a per-page rollback.
 *
 * We rebuild the result structurally rather than returning the parsed value
 * directly: zod's `.passthrough()` does not surface the `[key: string]:
 * unknown` index signature that `NotionPropertyValue`/`NotionPage` declare, so
 * a plain return would not be assignable without a cast. Rebuilding keeps the
 * function `as`-free while preserving every parsed field.
 */
export function parseNotionPage(value: unknown): NotionPage {
  const parsed = notionPageSchema.parse(value);
  const properties: Record<string, NotionPropertyValue> = {};
  for (const [key, prop] of Object.entries(parsed.properties)) {
    properties[key] = prop;
  }
  return {
    id: parsed.id,
    last_edited_time: parsed.last_edited_time,
    properties,
  };
}

// ---------------------------------------------------------------------------
// Inbound webhook payload (POST /api/notion/webhook)
// ---------------------------------------------------------------------------

/**
 * The fields the webhook route depends on: a `type` discriminator and an
 * optional `data.id` carrying the page id for `page.updated`. `.passthrough()`
 * keeps any other Notion-supplied fields without asserting their shape.
 */
export const webhookPayloadSchema = z
  .object({
    type: z.string(),
    data: z
      .object({ id: z.string().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
