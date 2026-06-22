import { test, expect } from '../fixtures';

/**
 * Process detail tabs (processes SPEC §"Process detail" / "e2e: tab switching").
 * Six tabs: resumo / evolucao / pendencias / documentos / pagamentos / mapa.
 * Authenticated as the seeded Engeprat client.
 */
test.use({ storageState: 'e2e/storage/engeprat.json' });

const TAB_LABELS: ReadonlyArray<RegExp> = [
  /resumo/i,
  /evolução|evolucao/i,
  /pendências|pendencias/i,
  /documentos/i,
  /pagamentos/i,
  /mapa/i,
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

  test('resumo tab is the default selection on open', async ({ page }) => {
    await page.goto('/portal');
    await page
      .getByRole('button', { name: /ver detalhes|view details/i })
      .first()
      .click();

    const resumo = page.getByRole('tab', { name: /resumo/i });
    await expect(resumo).toHaveAttribute('aria-selected', 'true', {
      timeout: 15_000,
    });
  });
});
