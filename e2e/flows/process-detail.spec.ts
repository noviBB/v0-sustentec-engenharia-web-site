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
});
