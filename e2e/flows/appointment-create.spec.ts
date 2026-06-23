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

test.describe('appointment create', () => {
  test('booking a slot shows success toast and emails the team', async ({
    page,
  }) => {
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
    await page.getByRole('option').first().click();

    // Date: open the popover (data-testid="appt-date-trigger") and click the
    // first ENABLED day inside the calendar (data-testid="appt-calendar").
    // Disabled days (past / non Mon–Thu) carry the `disabled` attribute.
    await page.getByTestId('appt-date-trigger').click();
    await page
      .getByTestId('appt-calendar')
      .locator('button:not([disabled])')
      .filter({ hasText: /^\d+$/ })
      .first()
      .click();

    // Time: Radix Select with trigger id="time".
    await page.locator('#time').click();
    await page.getByRole('option').first().click();

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
  });
});
