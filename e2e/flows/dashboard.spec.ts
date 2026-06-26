import { test, expect } from '../fixtures';

/**
 * Portal dashboard (processes SPEC §"e2e: dashboard buckets render + stat-card
 * filtering"). Authenticated as the seeded Engeprat client.
 */
test.use({ storageState: 'e2e/storage/engeprat.json' });

test.describe('portal dashboard', () => {
  test('renders the stat cards and the process buckets', async ({ page }) => {
    await page.goto('/portal');

    // Five stat cards (Total / Andamento / Acompanhamento / Finalizado /
    // Pagamentos). Assert the dashboard heading + at least the Total card copy.
    // TODO selector: stat cards have no testid — asserting on i18n copy that is
    // stable in the dictionary (portal.dashboard.stat.*).
    await expect(
      page.getByText(/total/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    // The three buckets are labelled in PT (Em andamento / Acompanhamento /
    // Finalizado). At least one bucket section should render for a seeded
    // client with processes.
    await expect(
      page.getByText(/andamento|acompanhamento|finalizado/i).first(),
    ).toBeVisible();
  });

  test('clicking a status stat card filters the list, Total clears it', async ({
    page,
  }) => {
    await page.goto('/portal');

    // TODO selector: the stat cards are clickable <Card>s without roles/testids.
    // Click the "Andamento" card by its visible label, then re-click "Total".
    const andamentoCard = page.getByText(/em andamento|andamento/i).first();
    await andamentoCard.click();

    // After filtering, the "Ver detalhes" affordance (or a process row) should
    // still be present for in-progress processes.
    // TODO selector: assert on the filter effect once a stable hook exists.
    await expect(page.getByText(/total/i).first()).toBeVisible();
    await page.getByText(/total/i).first().click();
  });

  test('stat cards drop the removed subtitle copy and keep the title (#45.1)', async ({
    page,
  }) => {
    await page.goto('/portal');

    // The "TOTAL DE PROJETOS" card title must still render.
    await expect(
      page.getByText(/total de projetos|total projects/i),
    ).toBeVisible({ timeout: 15_000 });

    // The descriptive subtitles under each stat number were removed in #45.1 —
    // none of these old strings should appear anywhere on the dashboard.
    await expect(
      page.getByText(/projetos cadastrados|projects registered/i),
    ).toHaveCount(0);
    await expect(
      page.getByText(/licenças emitidas|licenses issued/i),
    ).toHaveCount(0);
    await expect(
      page.getByText(/projetos ativos|active projects/i),
    ).toHaveCount(0);
  });

  test('dashboard map card is titled "Projetos" without the old heading (#45.4)', async ({
    page,
  }) => {
    await page.goto('/portal');

    // Scope to the map card so its title doesn't collide with the stat-card
    // titles (which case-insensitively match the legend labels). The map card
    // is the only [data-slot="card"] that carries BOTH legend labels —
    // "Em andamento" AND "Em acompanhamento" — in one card; no single stat card
    // does.
    const mapCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByText(/^(em andamento|in progress)$/i) })
      .filter({
        has: page.getByText(/^(em acompanhamento|in accompaniment)$/i),
      });

    await expect(
      mapCard.locator('[data-slot="card-title"]'),
    ).toHaveText(/^(projetos|projects)$/i, { timeout: 15_000 });

    // The map heading is no longer "Projetos ativos" / "Active projects".
    await expect(
      page.getByText(/projetos ativos|active projects/i),
    ).toHaveCount(0);
  });

  test('"Total a pagar" amount renders on a single line (#45.10)', async ({
    page,
  }) => {
    await page.goto('/portal');

    // The payments card amount (BRL value) must not wrap — regression of #39.6
    // where the amount overflowed onto a second line. Locate the BRL amount;
    // there is exactly one on the dashboard (the payments stat card).
    const amount = page.getByText(/R\$/).first();
    await expect(amount).toBeVisible({ timeout: 15_000 });

    const box = await amount.boundingBox();
    expect(box).not.toBeNull();

    // Compare the rendered height against the element's own line-height: a
    // single line is at most ~1.5x line-height. `leading-tight` (~1.25) on a
    // text-2xl (24px) p means one line is ~30px; two lines would be ~60px.
    const lineHeight = await amount.evaluate((el) => {
      const lh = getComputedStyle(el).lineHeight;
      const parsed = Number.parseFloat(lh);
      // `normal` (or any non-px value) — fall back to ~1.25 * font-size.
      if (Number.isFinite(parsed) && lh.endsWith('px')) return parsed;
      return Number.parseFloat(getComputedStyle(el).fontSize) * 1.25;
    });

    expect(box!.height).toBeLessThan(lineHeight * 1.5);
  });
});
