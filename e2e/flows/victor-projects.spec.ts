import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';

/**
 * Victor's project statuses and dashboard map (issues #41.2, #41.3, #34.11).
 *
 * Authenticated as the seeded `victor` client (victorfr2026ok@gmail.com), whose
 * processes are defined in `scripts/seed-data.ts` (VICTOR_PROCESSES) — the seed
 * is what CI runs against.
 *
 * Bucket membership reconciled from #41.2/#41.3 (which SUPERSEDE #34.11 where
 * they overlap). Confirmed against the seed:
 *   Finalizado:       CC 25-072, CC 25-073   (+ CC 25-119, CC 24-044 — extra
 *                     Finalizados in the seed, not in the reconciled list; they
 *                     are excluded from the map and not asserted here)
 *   Acompanhamento:   CC 24-016, CC 24-015, CC 24-017, CC 24-061, CC 24-006
 *   Andamento:        CC 26-021
 * No mismatch vs the reconciled list for the eight named codes.
 *
 * Bucket group headers in the dashboard list render the i18n bucket labels:
 *   andamento      -> "Em andamento"   / "In progress"
 *   acompanhamento -> "Em acompanhamento" / "In monitoring"
 *   finalizado     -> "Finalizado"     / "Finalized"
 */
test.use({ storageState: 'e2e/storage/victor.json' });

/**
 * Locate a bucket group container (the `<div>` that directly wraps the bucket
 * `<h4>` header and its process rows) so we can assert which process code chips
 * live inside it. The dashboard renders each bucket as
 * `<div><h4>{label}</h4>...rows...</div>`, so the group is the header's parent.
 */
function bucketGroup(page: Page, headerRe: RegExp) {
  return page
    .getByRole('heading', { level: 4, name: headerRe })
    .locator('xpath=..');
}

test.describe('victor projects', () => {
  test('process codes appear under the correct status bucket (#41.2/#41.3/#34.11)', async ({
    page,
  }) => {
    await page.goto('/portal');

    // Wait for the grouped process list to render at least one bucket header.
    await expect(
      page
        .getByRole('heading', { level: 4 })
        .filter({ hasText: /finalizado|finalized|acompanhamento|monitoring|andamento|in progress/i })
        .first(),
    ).toBeVisible({ timeout: 15_000 });

    const finalizados = bucketGroup(page, /^(finalizado|finalized)$/i);
    const acompanhamento = bucketGroup(page, /em acompanhamento|in monitoring/i);
    const andamento = bucketGroup(page, /em andamento|in progress/i);

    // Finalizados: CC 25-072 & CC 25-073.
    await expect(finalizados.getByText(/CC 25-072/i)).toBeVisible();
    await expect(finalizados.getByText(/CC 25-073/i)).toBeVisible();

    // Em acompanhamento: CC 24-016 (+ the rest of the accompaniment set).
    await expect(acompanhamento.getByText(/CC 24-016/i)).toBeVisible();
    await expect(acompanhamento.getByText(/CC 24-015/i)).toBeVisible();
    await expect(acompanhamento.getByText(/CC 24-017/i)).toBeVisible();
    await expect(acompanhamento.getByText(/CC 24-061/i)).toBeVisible();
    await expect(acompanhamento.getByText(/CC 24-006/i)).toBeVisible();

    // Em andamento: CC 26-021.
    await expect(andamento.getByText(/CC 26-021/i)).toBeVisible();
  });

  test('dashboard map plots one marker per active project with coordinates', async ({
    page,
  }) => {
    await page.goto('/portal');

    const map = page.locator('.leaflet-container');
    await expect(map).toBeVisible({ timeout: 15_000 });

    // N = Victor's andamento + acompanhamento processes with non-null lat AND
    // lng (Finalizados are excluded from the dashboard map). From the seed:
    //   andamento:      CC 26-021                                  -> 1
    //   acompanhamento: CC 24-016, CC 24-015, CC 24-017,
    //                   CC 24-061, CC 24-006                       -> 5
    // All six have coordinates, so N = 6.
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(6);
  });
});
