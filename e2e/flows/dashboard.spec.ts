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

  test('clicking a status stat card filters the list + focuses it, Total clears it (#39.1)', async ({
    page,
  }) => {
    await page.goto('/portal');

    // The stat cards are role="button" Cards; their accessible name includes the
    // i18n title. Click "EM ANDAMENTO".
    await page.getByRole('button', { name: /em andamento/i }).first().click();

    // The list below filters to ONLY the andamento bucket (the "Finalizado"
    // group header disappears), and the list container (the tabindex=-1 wrapper)
    // receives focus — the scroll/focus affordance from toggleBucketFilter.
    await expect(
      page.getByRole('heading', { level: 4, name: /em andamento|in progress/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('heading', { level: 4, name: /finalizado|finalized/i }),
    ).toHaveCount(0);
    await expect(page.locator('div[tabindex="-1"]')).toBeFocused();

    // Clicking the TOTAL card clears the filter — the Finalizado group returns.
    await page
      .getByRole('button', { name: /total de projetos|total projects/i })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { level: 4, name: /finalizado|finalized/i }),
    ).toBeVisible();
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

    // The dashboard map card title is exactly "PROJETOS" / "PROJECTS". The
    // anchored regex distinguishes it from the process-list card ("MEUS
    // PROJETOS") and the stat-card titles ("TOTAL DE PROJETOS", etc.), so the
    // map card is the only [data-slot="card-title"] that matches.
    const mapTitle = page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: /^(projetos|projects)$/i });

    await expect(mapTitle).toHaveCount(1, { timeout: 15_000 });
    await expect(mapTitle).toBeVisible();

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

  test('"Total a pagar" equals the seeded pending+overdue sum (#39.7)', async ({
    page,
  }) => {
    await page.goto('/portal');
    // Engeprat seed pending payments: CC 26-004 2×8500 + CC 26-016 2×6200 =
    // R$ 29.400,00 (the paid installments and the finalized project are excluded).
    await expect(
      page.getByText(/R\$\s*29\.400,00/).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('dashboard map plots one marker per active engeprat project (#45.4-5)', async ({
    page,
  }) => {
    await page.goto('/portal');
    await expect(page.locator('.leaflet-container')).toBeVisible({
      timeout: 15_000,
    });
    // Andamento+acompanhamento with coordinates: CC 26-004 + CC 26-016 = 2
    // (CC 26-017 is finalizado → excluded from the dashboard map).
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);
  });

  test('sidebar shows Sustentec Tracker branding + Leon Dalmasso, no "Portal do Cliente" (#41.1/#39.5)', async ({
    page,
  }) => {
    await page.goto('/portal');
    await expect(
      page.getByText(/sustentec tracker/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page
        .getByText(
          /acompanhe seu processo ambiental em tempo real|track your environmental process in real time/i,
        )
        .first(),
    ).toBeVisible();
    await expect(page.getByText(/leon dalmasso/i)).toBeVisible();
    await expect(page.getByText(/portal do cliente/i)).toHaveCount(0);
  });

  test('"Nova proposta do Projeto" shortcut mailto targets leondalmasso cc contato (#34.10)', async ({
    page,
  }) => {
    await page.goto('/portal');
    await expect(
      page.getByText(/nova proposta do projeto|new project proposal/i),
    ).toBeVisible({ timeout: 15_000 });
    const link = page.locator(
      'a[href^="mailto:leondalmasso@sustentec-engenharia.com.br"]',
    );
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute(
      'href',
      /^mailto:leondalmasso@sustentec-engenharia\.com\.br\?cc=contato%40sustentec-engenharia\.com\.br/i,
    );
  });

  test('the Resolver Pendências total sums the per-project pendências (#34.1)', async ({
    page,
    resetDb,
  }) => {
    // Reset the per-process seen cursor so all open pendências read as unseen:
    // engeprat seed has CC 26-004 (2 open) + CC 26-016 (1 open) = 3.
    await resetDb(['public.process_pendencia_seen']);
    await page.goto('/portal');
    await expect(
      page.getByText(/você tem 3 iten?s? pendentes?|you have 3 pending items?/i),
    ).toBeVisible({ timeout: 15_000 });
  });
});
