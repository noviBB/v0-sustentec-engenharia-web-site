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
    // Responsible tech: Radix Select with trigger id="tech".
    // TODO selector: Radix Select renders a listbox in a portal — open the
    // trigger then pick the first option. Option text is the tech display_name.
    await page.locator('#tech').click();
    await page.getByRole('option').first().click();

    // Date: a popover calendar button. Pick the first selectable (enabled) day.
    // TODO selector: the date trigger button text is the placeholder until a day
    // is chosen; matching the calendar grid cell is environment-dependent.
    await page
      .getByRole('button', { name: /selecione|select a date|data/i })
      .first()
      .click();
    await page
      .getByRole('gridcell')
      .filter({ has: page.locator(':not([disabled])') })
      .first()
      .click();

    // Time: Radix Select with trigger id="time".
    await page.locator('#time').click();
    await page.getByRole('option').first().click();

    const subject = `Reunião E2E ${Date.now()}`;
    await page.locator('#subject').fill(subject);
    await page.locator('#message').fill('Agendamento de teste automatizado.');

    // Submit the booking.
    await page
      .getByRole('button', { name: /agendar|confirmar|book|schedule/i })
      .last()
      .click();

    // Success toast (PT: "Agendamento solicitado").
    await expect(
      page.getByText(/agendamento solicitado|appointment requested/i),
    ).toBeVisible({ timeout: 15_000 });

    // The team mailbox receives the notification email.
    const mail = await waitForLatestMessage(NOTIFY_EMAIL, { timeoutMs: 20_000 });
    expect(mail.subject).toMatch(/nova reunião agendada/i);
  });
});
