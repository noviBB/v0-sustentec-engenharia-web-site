import type { ProcessRow } from "@/modules/processes/processes.repo"
import type { Client } from "@/modules/clients/clients.repo"
import { licenseTypeLabel } from "@/lib/constants/license-type-labels"

const DASH = "—"

function nonEmpty(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : DASH
}

export type ProjectDataRow = { label: string; value: string }

/** The 10 "Dados do Projeto" rows (issue #43), in display order. */
export function buildProjectDataRows(
  process: ProcessRow,
  client: Client,
  t: (key: string) => string,
): ProjectDataRow[] {
  return [
    {
      label: t("portal.process.resumo.cnpj"),
      value: nonEmpty(process.client_cnpj),
    },
    {
      label: t("portal.process.resumo.instrument"),
      value:
        process.license_types.length > 0
          ? process.license_types.map(licenseTypeLabel).join(", ")
          : DASH,
    },
    {
      label: t("portal.process.resumo.agency"),
      value: nonEmpty(process.environmental_agency),
    },
    {
      label: t("portal.process.resumo.processingTime"),
      value: nonEmpty(process.tempo_tramitacao),
    },
    {
      label: t("portal.process.resumo.responsibleTech"),
      value: nonEmpty(process.responsible_tech_name),
    },
    {
      label: t("portal.process.resumo.scope"),
      value: nonEmpty(process.objective),
    },
    {
      label: t("portal.process.resumo.applicant"),
      value: nonEmpty(client.name),
    },
    {
      label: t("portal.process.resumo.clientContact"),
      value: nonEmpty(client.contact_name),
    },
    {
      label: t("portal.process.resumo.contactEmail"),
      value: nonEmpty(client.contact_email),
    },
    {
      label: t("portal.process.resumo.contactPhone"),
      value: nonEmpty(client.contact_phone),
    },
  ]
}
