/**
 * Display labels for the `process_license_type` enum, client-safe (no
 * `server-only` import chain — `lib/notion/*` must NOT be imported from
 * client components). The portal Resumo joins these for the "Tipo de
 * licença" row; values are shared PT/EN since they are sector acronyms.
 */
export const LICENSE_TYPE_LABELS: Record<string, string> = {
  LP: 'LP — Licença Prévia',
  LI: 'LI — Licença de Instalação',
  LO: 'LO — Licença de Operação',
  LAS: 'LAS — Licença Ambiental Simplificada',
  LMA: 'LMA — Licença de Manutenção de Atividade',
  renovacao: 'Renovação',
  outros: 'Outros',
};

export function licenseTypeLabel(value: string): string {
  return LICENSE_TYPE_LABELS[value] ?? value;
}
