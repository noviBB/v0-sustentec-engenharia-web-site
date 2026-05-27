import { normalizeLabel } from './parsers';
import type { ProcessBucket, ProcessStatus } from './types';

/**
 * Maps a raw Notion `Situação` label to the canonical `process_status` enum.
 *
 * The current `process_status` enum is { andamento, acompanhamento,
 * finalizado, arquivado }. The issue references additional conceptual states
 * (passivo, cancelado) that the schema does not yet have, so we fold them onto
 * the closest existing value and preserve the raw label in `status_label`:
 *   - passivo   -> acompanhamento (a passive/monitored process)
 *   - cancelado -> arquivado      (no live work)
 *
 * Matching is whitespace/case-insensitive on the normalized label. Unknown
 * labels fall back to `andamento` (the table default) — the raw label is still
 * preserved, so no information is lost.
 */
const STATUS_MAP: Record<string, ProcessStatus> = {
  // andamento
  andamento: 'andamento',
  'em andamento': 'andamento',
  'em analise': 'andamento',
  'em análise': 'andamento',
  'aguardando docs': 'andamento',
  // acompanhamento
  acompanhamento: 'acompanhamento',
  'em acompanhamento': 'acompanhamento',
  passivo: 'acompanhamento',
  'passivo ambiental': 'acompanhamento',
  // finalizado
  finalizado: 'finalizado',
  finalizada: 'finalizado',
  concluido: 'finalizado',
  concluído: 'finalizado',
  concluida: 'finalizado',
  concluída: 'finalizado',
  entregue: 'finalizado',
  // arquivado
  arquivado: 'arquivado',
  arquivada: 'arquivado',
  cancelado: 'arquivado',
  cancelada: 'arquivado',
};

export function statusFromLabel(rawLabel: string | null): ProcessStatus {
  if (rawLabel == null) return 'andamento';
  const key = normalizeLabel(rawLabel);
  return STATUS_MAP[key] ?? 'andamento';
}

/**
 * The portal groups processes into three top-level buckets. `arquivado`
 * collapses into `finalizado` for display purposes (archived work is "done"
 * from the client's perspective).
 */
export function bucketFromStatus(status: ProcessStatus): ProcessBucket {
  switch (status) {
    case 'andamento':
      return 'andamento';
    case 'acompanhamento':
      return 'acompanhamento';
    case 'finalizado':
    case 'arquivado':
      return 'finalizado';
    default:
      return 'andamento';
  }
}

export function bucketFromLabel(rawLabel: string | null): ProcessBucket {
  return bucketFromStatus(statusFromLabel(rawLabel));
}
