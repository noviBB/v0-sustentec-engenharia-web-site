import 'server-only';

import type { Client } from '@/lib/db/clients';
import type { PaymentRow } from '@/lib/db/payments';
import { sendEmail } from './resend';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const ptDate = new Intl.DateTimeFormat('pt-BR');

function formatDate(value: string | Date | null): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return ptDate.format(d);
}

export interface SendPaymentOverdueEmailParams {
  client: Pick<Client, 'id' | 'name' | 'contact_email' | 'contact_name'>;
  payments: PaymentRow[];
}

/**
 * Sends an overdue-payment notification email (PT-BR) to a single client,
 * summarising every payment that flipped to `overdue` in this cron run.
 *
 * No-ops (returns false) when the client has no `contact_email` — the cron
 * just skips silently rather than fail.
 */
export async function sendPaymentOverdueEmail(
  params: SendPaymentOverdueEmailParams,
): Promise<boolean> {
  const { client, payments } = params;
  if (!client.contact_email) return false;
  if (payments.length === 0) return false;

  const total = payments.reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
  const rows = payments
    .map(
      (p) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">Parcela ${p.installment_no}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${formatDate(p.due_date)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${brl.format(Number(p.amount))}</td>
      </tr>`,
    )
    .join('');

  const greeting = client.contact_name
    ? `Olá, ${client.contact_name}`
    : `Olá, ${client.name}`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:560px;margin:auto;">
      <h2 style="color:#2d5a27;">Pagamento em atraso</h2>
      <p>${greeting},</p>
      <p>
        Identificamos que ${payments.length === 1 ? 'a parcela abaixo está' : 'as parcelas abaixo estão'}
        com pagamento em atraso. Por favor, regularize o quanto antes para
        evitar suspensão do andamento dos seus projetos.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        <thead>
          <tr style="background:#f5f1e6;">
            <th style="padding:8px;text-align:left;">Parcela</th>
            <th style="padding:8px;text-align:left;">Vencimento</th>
            <th style="padding:8px;text-align:right;">Valor</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:8px;text-align:right;font-weight:bold;">Total em atraso:</td>
            <td style="padding:8px;text-align:right;font-weight:bold;">${brl.format(total)}</td>
          </tr>
        </tfoot>
      </table>
      <p>
        Em caso de dúvida, fale com seu responsável técnico pelo portal ou
        responda este e-mail.
      </p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">
        Sustentec Engenharia — esta é uma mensagem automática.
      </p>
    </div>
  `;

  await sendEmail({
    to: client.contact_email,
    subject: 'Pagamento em atraso',
    html,
  });
  return true;
}
