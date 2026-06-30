import type { Page } from '@playwright/test';

import { test, expect } from '../fixtures';

/**
 * Cadastral update (clients SPEC §"E2E (form save)"): open Dados Cadastrais,
 * edit a field, save → success toast + persisted value on reload; invalid email
 * → inline error and no submit.
 *
 * Authenticated as the seeded Engeprat client.
 */
test.use({ storageState: 'e2e/storage/engeprat.json' });

async function openDadosCadastrais(page: Page) {
  await page.goto('/portal');
  // Sidebar nav → Dados Cadastrais (PT "Dados Cadastrais").
  // TODO selector: i18n nav label, no testid.
  await page
    .getByRole('button', { name: /dados cadastrais|account details/i })
    .first()
    .click();
}

test.describe('cadastral update', () => {
  test('edit a field and save shows a success toast and persists', async ({
    page,
    resetDb,
  }) => {
    // Reseed clients so contact_name is restored to its baseline each run
    // (this test mutates it).
    await resetDb(['public.clients']);

    await openDadosCadastrais(page);

    // Enter edit mode (PT "Editar").
    await page.getByRole('button', { name: /editar|edit/i }).first().click();

    const newName = `Contato E2E ${Date.now()}`;
    // Stable id on the edit form input.
    await page.locator('#contact_name').fill(newName);

    // Save (PT "Salvar").
    await page.getByRole('button', { name: /salvar|save/i }).first().click();

    // Success toast (PT: "Dados cadastrais atualizados."). The text appears in
    // both the toast and its aria-live announcer, so scope to the first.
    await expect(
      page
        .getByText(/dados cadastrais atualizados|client details updated/i)
        .first(),
    ).toBeVisible({ timeout: 10_000 });

    // Value persists across a reload.
    await page.reload();
    await openDadosCadastrais(page);
    await expect(page.getByText(newName)).toBeVisible({ timeout: 10_000 });
  });

  test('invalid email shows an inline error and does not submit', async ({
    page,
  }) => {
    await openDadosCadastrais(page);
    await page.getByRole('button', { name: /editar|edit/i }).first().click();

    await page.locator('#contact_email').fill('not-an-email');
    await page.getByRole('button', { name: /salvar|save/i }).first().click();

    // Inline validation error renders from the i18n key
    // portal.dados.validation.invalidEmail. No success toast appears.
    // TODO selector: error text has no testid — asserting on copy.
    await expect(
      page.getByText(/e-?mail inválido|invalid e-?mail/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/dados cadastrais atualizados|client details updated/i),
    ).toHaveCount(0);
  });

  test('read view shows CNPJ/CPF and mailing address, and drops Cargo', async ({
    page,
  }) => {
    await openDadosCadastrais(page);

    await expect(page.getByText(/cnpj\/cpf/i)).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/endereço de correspondência|mailing address/i),
    ).toBeVisible();
    // "Cargo" / "Role" (contact role) was removed in #43.3.
    await expect(page.getByText(/^cargo$|^role$/i)).toHaveCount(0);
  });

  test('read view shows the client label exactly once (no duplicate eyebrow)', async ({
    page,
  }) => {
    await openDadosCadastrais(page);

    // #43.2: the client card used to stack an eyebrow word "Cliente" above the
    // section title (a visual duplicate). Now only the section title renders
    // (portal.dados.section.client = "CLIENTE", shown as the CardTitle) plus the
    // client's name. The eyebrow (portal.dados.section.client.eyebrow) is gone,
    // so the standalone word "Cliente" must appear exactly once as a label.
    // Case-insensitive whole-string match catches the "CLIENTE" title; the
    // subtitle ("Informações do cliente…") is not a whole-string match.
    await expect(page.getByText(/^cliente$/i)).toHaveCount(1);
  });
});
