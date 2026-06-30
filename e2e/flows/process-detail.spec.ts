import { test, expect } from '../fixtures';

/**
 * Process detail tabs (processes SPEC §"Process detail" / "e2e: tab switching").
 * Six tabs: resumo / evolucao / pendencias / documentos / pagamentos / mapa.
 * Authenticated as the seeded Engeprat client.
 */
test.use({ storageState: 'e2e/storage/engeprat.json' });

const TAB_LABELS: ReadonlyArray<RegExp> = [
  // Tab value stays "resumo"; the visible label is now "Dados" / "Data" (#43.7).
  /dados|data/i,
  /evolução|evolucao/i,
  /pendências|pendencias/i,
  /documentos/i,
  /pagamentos/i,
  // The map tab is labelled "Localização" / "Location" (not "Mapa").
  /localização|location/i,
];

test.describe('process detail', () => {
  test('opens a process and switches through all six tabs', async ({ page }) => {
    await page.goto('/portal');

    // Open the first process from the dashboard list.
    // TODO selector: "Ver detalhes" buttons have no testid; matching on copy
    // (portal.dashboard.process.viewDetails — PT "Ver detalhes").
    await page
      .getByRole('button', { name: /ver detalhes|view details/i })
      .first()
      .click();

    // Tabs render as Radix Tabs (role="tab"). Click each and assert it becomes
    // selected. The trigger values are resumo/evolucao/pendencias/documentos/
    // pagamentos/mapa per the SPEC.
    for (const label of TAB_LABELS) {
      const tab = page.getByRole('tab', { name: label });
      await expect(tab).toBeVisible({ timeout: 15_000 });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('dados tab is the default selection on open', async ({ page }) => {
    await page.goto('/portal');
    await page
      .getByRole('button', { name: /ver detalhes|view details/i })
      .first()
      .click();

    const dados = page.getByRole('tab', { name: /dados|data/i });
    await expect(dados).toHaveAttribute('aria-selected', 'true', {
      timeout: 15_000,
    });
  });

  test('dados tab shows the project data fields and drops removed rows', async ({
    page,
  }) => {
    await page.goto('/portal');
    await page
      .getByRole('button', { name: /ver detalhes|view details/i })
      .first()
      .click();

    // Dados tab is the default; assert the renamed title and new labels (#43.8/9).
    await expect(
      page.getByText(/dados do projeto|project data/i),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/analista responsável|responsible analyst/i),
    ).toBeVisible();
    await expect(page.getByText(/requerente|applicant/i)).toBeVisible();

    // Rows removed in #43.5 / renamed title must not appear.
    await expect(
      page.getByText(/classe de impacto|impact class/i),
    ).toHaveCount(0);
    await expect(
      page.getByText(/resumo do enquadramento|licensing framework summary/i),
    ).toHaveCount(0);
  });

  // #43.9 — every one of the 10 "Dados do Projeto" rows is labelled. The rows
  // come from project-data-rows.ts (portal.process.resumo.*); the Dados tab is
  // the default selection so no tab click is needed.
  test('dados tab labels all ten project-data rows (#43.9)', async ({
    page,
  }) => {
    await page.goto('/portal');
    await page
      .getByRole('button', { name: /ver detalhes|view details/i })
      .first()
      .click();

    // Wait for the Dados card to render before asserting the rows.
    await expect(
      page.getByText(/dados do projeto|project data/i),
    ).toBeVisible({ timeout: 15_000 });

    const ROW_LABELS: ReadonlyArray<RegExp> = [
      /cnpj\/cpf/i, // resumo.cnpj (same PT/EN)
      /instrumento|instrument/i, // resumo.instrument
      /órgão licenciador|orgao licenciador|licensing agency/i, // resumo.agency
      /tempo de tramitação|tempo de tramitacao|processing time/i, // resumo.processingTime
      /analista responsável|analista responsavel|responsible analyst/i, // resumo.responsibleTech
      /escopo do serviço|escopo do servico|service scope/i, // resumo.scope
      /requerente|applicant/i, // resumo.applicant
      /contato do cliente|client contact/i, // resumo.clientContact
      /e-?mail do contato|contact email/i, // resumo.contactEmail
      /telefone de contato|contact phone/i, // resumo.contactPhone
    ];

    for (const label of ROW_LABELS) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  // #39.4 — tabs render in a fixed order, Localização last. The visible labels
  // come straight from the tablist (scoped so the Localização *card* title
  // doesn't interfere). Default language is PT.
  test('tabs render in the expected order with localização last (#39.4)', async ({
    page,
  }) => {
    await page.goto('/portal');
    await page
      .getByRole('button', { name: /ver detalhes|view details/i })
      .first()
      .click();

    const tablist = page.getByRole('tablist');
    await expect(tablist).toBeVisible({ timeout: 15_000 });

    const names = await tablist.getByRole('tab').allInnerTexts();
    const order = names.map((n) => n.trim());

    const EXPECTED: ReadonlyArray<RegExp> = [
      /dados|data/i,
      /evolução|evolucao|progress/i,
      /pendências|pendencias|pending items/i,
      /documentos|documents/i,
      /pagamentos|payments/i,
      /localização|localizacao|location/i,
    ];

    expect(order).toHaveLength(EXPECTED.length);
    EXPECTED.forEach((re, i) => expect(order[i]).toMatch(re));
    // Localização is explicitly the last tab.
    expect(order.at(-1)).toMatch(/localização|localizacao|location/i);
  });

  // #34.2 — the "Progresso"/"Progress" wording was dropped from the detail
  // view. Default language is PT, so the EN-only "Progress" evolution-tab
  // label never renders; the word-based assertion is safe.
  test('process detail shows no "Progresso" wording (#34.2)', async ({
    page,
  }) => {
    await page.goto('/portal');
    await page
      .getByRole('button', { name: /ver detalhes|view details/i })
      .first()
      .click();

    await expect(
      page.getByText(/dados do projeto|project data/i),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/progresso|progress/i)).toHaveCount(0);
  });

  // #34.4 — "Tipologia" / "Typology" was removed from the Dados rows.
  test('dados tab shows no "Tipologia" row (#34.4)', async ({ page }) => {
    await page.goto('/portal');
    await page
      .getByRole('button', { name: /ver detalhes|view details/i })
      .first()
      .click();

    await expect(
      page.getByText(/dados do projeto|project data/i),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/tipologia|typology/i)).toHaveCount(0);
  });

  // #34.5 — the dates card surfaces "Prazo total estimado" (the due-date
  // label, portal.process.dates.due). It lives above the tabs and is always
  // visible.
  test('dates card shows "Prazo total estimado" (#34.5)', async ({ page }) => {
    await page.goto('/portal');
    await page
      .getByRole('button', { name: /ver detalhes|view details/i })
      .first()
      .click();

    await expect(
      page.getByText(/prazo total estimado|total estimated deadline/i),
    ).toBeVisible({ timeout: 15_000 });
  });

  // The Localização tab renders a Leaflet map; when the opened process has
  // coordinates (all seeded engeprat processes do — scripts/seed-data.ts) the
  // map shows exactly one marker and no "no coordinates" empty state.
  test('localização tab renders a single map marker', async ({ page }) => {
    await page.goto('/portal');
    await page
      .getByRole('button', { name: /ver detalhes|view details/i })
      .first()
      .click();

    await page
      .getByRole('tab', { name: /localização|localizacao|location/i })
      .click();

    const map = page.locator('.leaflet-container');
    await expect(map).toBeVisible({ timeout: 15_000 });

    // Guard: only assert the marker when the map actually rendered (no empty
    // state). The empty-state copy is "Coordenadas não cadastradas".
    await expect(
      page.getByText(/coordenadas não cadastradas|coordinates not configured/i),
    ).toHaveCount(0);
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
  });
});
