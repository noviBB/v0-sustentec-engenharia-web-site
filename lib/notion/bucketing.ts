import { ProcessStatus } from '@/lib/db/enums';

import { normalizeLabel } from './parsers';
import type { ProcessBucket } from './types';

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
  andamento: ProcessStatus.Andamento,
  'em andamento': ProcessStatus.Andamento,
  'em analise': ProcessStatus.Andamento,
  'em análise': ProcessStatus.Andamento,
  'aguardando docs': ProcessStatus.Andamento,
  // acompanhamento
  acompanhamento: ProcessStatus.Acompanhamento,
  'em acompanhamento': ProcessStatus.Acompanhamento,
  passivo: ProcessStatus.Acompanhamento,
  'passivo ambiental': ProcessStatus.Acompanhamento,
  // finalizado
  finalizado: ProcessStatus.Finalizado,
  finalizada: ProcessStatus.Finalizado,
  concluido: ProcessStatus.Finalizado,
  concluído: ProcessStatus.Finalizado,
  concluida: ProcessStatus.Finalizado,
  concluída: ProcessStatus.Finalizado,
  entregue: ProcessStatus.Finalizado,
  // arquivado
  arquivado: ProcessStatus.Arquivado,
  arquivada: ProcessStatus.Arquivado,
  cancelado: ProcessStatus.Arquivado,
  cancelada: ProcessStatus.Arquivado,
};

export function statusFromLabel(rawLabel: string | null): ProcessStatus {
  if (rawLabel == null) return ProcessStatus.Andamento;
  const key = normalizeLabel(rawLabel);
  return STATUS_MAP[key] ?? ProcessStatus.Andamento;
}

/**
 * The portal groups processes into three top-level buckets. `arquivado`
 * collapses into `finalizado` for display purposes (archived work is "done"
 * from the client's perspective).
 */
export function bucketFromStatus(status: ProcessStatus): ProcessBucket {
  switch (status) {
    case ProcessStatus.Andamento:
      return 'andamento';
    case ProcessStatus.Acompanhamento:
      return 'acompanhamento';
    case ProcessStatus.Finalizado:
    case ProcessStatus.Arquivado:
      return 'finalizado';
    default:
      return 'andamento';
  }
}

export function bucketFromLabel(rawLabel: string | null): ProcessBucket {
  return bucketFromStatus(statusFromLabel(rawLabel));
}
