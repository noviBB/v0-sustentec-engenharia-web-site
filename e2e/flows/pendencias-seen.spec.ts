import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';

/**
 * REGRESSION #45.6 — per-project pendências notification count clears after the
 * client views that project's Pendências tab, and the cleared state is DURABLE
 * (survives a full page reload), while OTHER projects keep their counts
 * (per-process isolation). Guards the regression of #39.8.
 *
 * Authenticated as the seeded Engeprat client. Engeprat has two projects with
 * open pendências in the seed:
 *   - "Enge Prat - UNOPS Planos"        (CC 26-004) — 2 open tasks
 *   - "Licenças Enge Prat - Niterói"    (CC 26-016) — 1 open task
 * and one finalized project with none. The per-process unseen badge is driven
 * by `process_pendencia_seen` (a per-user-per-process cursor) vs each open
 * `process_tasks` row's `created_at`: a process with no seen row counts ALL its
 * open tasks. Truncating the seen cursor (+ reseeding the tasks) therefore
 * restores every open task to "unseen" at the start of each run.
 *
 * The most robust observable is the portal sidebar's per-process amber count
 * badge: the "Processos" sub-menu is expanded by default, so each project's
 * badge is always in the DOM without navigating. The badge is the only
 * `bg-amber-500` badge inside a sidebar project button.
 */
test.use({ storageState: 'e2e/storage/engeprat.json' });

// The two seeded Engeprat projects that carry open pendências. We act on the
// first and assert the second is unaffected.
const TARGET = /enge prat - unops planos/i;
const OTHER = /licenças enge prat - niterói/i;

/** The per-process amber count badge inside a sidebar project button. */
function sidebarBadge(page: Page, name: RegExp) {
  // The desktop sidebar (`aside.hidden lg:block`) is the only rendered copy at
  // the Desktop Chrome viewport; the mobile sheet stays unmounted while closed.
  const button = page.getByRole('button', { name });
  return button.locator('span[data-slot="badge"].bg-amber-500');
}

test.describe('pendências per-project notification (#45.6)', () => {
  test('viewing a project clears its badge durably and leaves others intact', async ({
    page,
    resetDb,
  }) => {
    // Restore the open tasks and reset every per-process seen cursor so all open
    // pendências read as unseen at the start of the run.
    await resetDb(['public.process_pendencia_seen', 'public.process_tasks']);

    await page.goto('/portal');

    // Both projects show a badge with count > 0.
    const targetBadge = sidebarBadge(page, TARGET);
    const otherBadge = sidebarBadge(page, OTHER);
    await expect(targetBadge).toBeVisible({ timeout: 15_000 });
    await expect(otherBadge).toBeVisible();

    // Capture the target's starting count (sanity: > 0).
    const startText = (await targetBadge.textContent())?.trim() ?? '';
    expect(Number(startText)).toBeGreaterThan(0);

    // Open the target project from the sidebar, then switch to its Pendências
    // tab — that fires the mark-seen server action (which POSTs back to
    // /portal). We wait for that POST so the seen cursor is persisted before we
    // reload below.
    await page.getByRole('button', { name: TARGET }).click();

    const markSeen = page.waitForResponse(
      (res) =>
        res.url().includes('/portal') &&
        res.request().method() === 'POST' &&
        res.ok(),
    );
    await page.getByRole('tab', { name: /pend[êe]ncias|pending items/i }).click();
    await markSeen;

    // Optimistic clear: the target's sidebar badge drops to 0 / disappears,
    // while the other project's badge is untouched.
    await expect(targetBadge).toHaveCount(0);
    await expect(otherBadge).toBeVisible();

    // DURABLE persistence: a full reload re-reads the cursor from Postgres. The
    // target stays cleared; the other project still shows its badge.
    await page.reload();
    await expect(sidebarBadge(page, OTHER)).toBeVisible({ timeout: 15_000 });
    await expect(sidebarBadge(page, TARGET)).toHaveCount(0);
  });
});
