import { test, expect } from '../fixtures';
import { clearMailbox, waitForLatestMessage } from '../support/inbucket';

/**
 * Appointment booking (appointments SPEC §"e2e: booking flow"): drive the
 * SchedulingView, submit a valid booking, assert the success toast AND that a
 * notification email lands in Inbucket (subject + the tech CC).
 *
 * Authenticated as the seeded Engeprat client.
 */
test.use({ storageState: 'e2e/storage/engeprat.json' });

// The internal mailbox notified on every booking (overridable per env).
const NOTIFY_EMAIL =
  process.env.APPOINTMENT_NOTIFY_EMAIL ??
  'contato@sustentec-engenharia.com.br';

// Seeded active responsible techs in ascending display_name order (issue
// #34.8), with the email each one is CC'd under on the notification (#34.7).
// Mirrors scripts/seed-data.ts (RESPONSIBLE_TECHS, active=true). Note the
// seed uses @example.com addresses, not @sustentec-engenharia.com.br.
const SEEDED_TECHS: ReadonlyArray<{ displayName: string; email: string }> = [
  { displayName: 'Hilton Fontenele', email: 'hilton@example.com' },
  { displayName: 'Ivón O. Benítez', email: 'ivonoristela@example.com' },
  { displayName: 'Kely Figueira', email: 'kely@example.com' },
  { displayName: 'Laila Montel', email: 'laila@example.com' },
  { displayName: 'Leon Dalmasso', email: 'leondalmasso@example.com' },
  { displayName: 'Maíra Benedikt', email: 'maira@example.com' },
  { displayName: 'Marcelo Perello', email: 'marcelo@example.com' },
];

// Mailpit reads the same way the inbucket helper does; we hit the message
// endpoint directly only to read the Cc list, which the helper doesn't surface.
const MAILPIT_BASE_URL =
  process.env.MAILPIT_URL ??
  process.env.INBUCKET_URL ??
  'http://127.0.0.1:54324';

/** CC addresses of a captured Mailpit message, read by id. */
async function ccAddresses(messageId: string): Promise<string[]> {
  const res = await fetch(
    `${MAILPIT_BASE_URL}/api/v1/message/${encodeURIComponent(messageId)}`,
  );
  if (!res.ok) {
    throw new Error(`[mailpit] GET message ${messageId} failed: ${res.status}`);
  }
  const body = (await res.json()) as { Cc?: Array<{ Address?: string }> };
  return (body.Cc ?? []).map((c) => c.Address ?? '');
}

test.describe('appointment create', () => {
  test('booking a slot shows success toast and emails the team', async ({
    page,
    resetDb,
  }, testInfo) => {
    // Reset appointments first so a Playwright retry re-books against an empty
    // table (the unique-slot constraint would otherwise red the retry).
    await resetDb(['public.appointments']);

    await clearMailbox(NOTIFY_EMAIL);

    await page.goto('/portal');

    // Navigate to the scheduling view via the sidebar.
    // TODO selector: sidebar nav items are i18n labels without testids; match on
    // the Agendamentos / Scheduling copy.
    await page
      .getByRole('button', { name: /agendamento|agendar|scheduling/i })
      .first()
      .click();

    // --- Fill the scheduling form (Radix Select + date popover + inputs). ---
    // Responsible tech: Radix Select with trigger id="tech". Open it, pick the
    // first option (option text is the tech display_name).
    await page.locator('#tech').click();

    // #34.8 — the tech options are listed in ascending alphabetical order by
    // display_name (repo orders asc(display_name)). Read them while the select
    // is open and assert the sequence matches the seeded order.
    const techOptions = await page
      .getByRole('option')
      .allInnerTexts();
    const techNames = techOptions.map((t) => t.trim());
    expect(techNames).toEqual([...techNames].sort((a, b) => a.localeCompare(b)));
    expect(techNames).toEqual(SEEDED_TECHS.map((t) => t.displayName));

    // Pick the first option (the alphabetically-first tech) and remember its
    // display name so #34.7 can assert the matching CC below.
    const chosenTechName = techNames[0]!;
    await page.getByRole('option').first().click();

    // Date: open the popover (data-testid="appt-date-trigger") and click an
    // ENABLED day inside the calendar (data-testid="appt-calendar"). Disabled
    // days (past / non Mon–Thu) carry the `disabled` attribute. To keep retries
    // from colliding on the unique-slot constraint, vary the chosen day by
    // testInfo.retry (clamped to the available enabled days, falling back to
    // the first).
    await page.getByTestId('appt-date-trigger').click();
    const enabledDays = page
      .getByTestId('appt-calendar')
      .locator('button:not([disabled])')
      .filter({ hasText: /^\d+$/ });
    const dayCount = await enabledDays.count();
    const dayIndex = dayCount > 0 ? Math.min(testInfo.retry, dayCount - 1) : 0;
    await enabledDays.nth(dayIndex).click();

    // Time: Radix Select with trigger id="time". Vary the picked time by
    // testInfo.retry too, so even when the day repeats (only one enabled day)
    // a retry books a different slot. Clamp to the available options; fall back
    // to the first.
    await page.locator('#time').click();
    const timeOptions = page.getByRole('option');
    const timeCount = await timeOptions.count();
    const timeIndex =
      timeCount > 0 ? Math.min(testInfo.retry, timeCount - 1) : 0;
    await timeOptions.nth(timeIndex).click();

    const subject = `Reunião E2E ${Date.now()}`;
    await page.locator('#subject').fill(subject);
    await page.locator('#message').fill('Agendamento de teste automatizado.');

    // Submit the booking (data-testid="appt-submit"); enabled once the form is
    // complete.
    await page.getByTestId('appt-submit').click();

    // Success toast (PT: "Agendamento solicitado"). Text also appears in the
    // aria-live announcer, so scope to .first().
    await expect(
      page.getByText(/agendamento solicitado|appointment requested/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    // The team mailbox receives the notification email.
    const mail = await waitForLatestMessage(NOTIFY_EMAIL, { timeoutMs: 20_000 });
    expect(mail.subject).toMatch(/nova reunião agendada/i);

    // #34.7 — the chosen responsável is CC'd on the notification. Map the
    // display name we clicked to its seeded email and assert it appears in the
    // message's Cc list (read directly from Mailpit; the helper omits Cc).
    const chosenTech = SEEDED_TECHS.find((t) => t.displayName === chosenTechName);
    expect(chosenTech, `unknown tech option "${chosenTechName}"`).toBeTruthy();
    const cc = await ccAddresses(mail.id);
    expect(cc).toContain(chosenTech!.email);
  });
});
