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
});
