import { describe, it, expect } from "vitest"
import { buildProjectDataRows } from "@/modules/processes/components/project-data-rows"
import type { ProcessRow } from "@/modules/processes/processes.repo"
import type { Client } from "@/modules/clients/clients.repo"

const t = (key: string) => key

function makeProcess(overrides: Partial<ProcessRow> = {}): ProcessRow {
  return {
    client_cnpj: "12345678000190",
    license_types: ["LP", "LI"],
    environmental_agency: "INEA",
    tempo_tramitacao: "6 meses",
    responsible_tech_name: "Ana Souza",
    objective: "Licenciamento da obra",
    classe_impacto: "II",
    atividade_licenciada: "Construção",
    ...overrides,
  } as ProcessRow
}

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    name: "Requerente X",
    contact_name: "João Contato",
    contact_email: "joao@exemplo.com",
    contact_phone: "+55 22 99999-9999",
    ...overrides,
  } as Client
}

const valueOf =
  (rows: ReturnType<typeof buildProjectDataRows>) => (label: string) =>
    rows.find((r) => r.label === label)!.value

describe("buildProjectDataRows", () => {
  it("returns the 10 fields in the documented order, mapped to their sources", () => {
    const rows = buildProjectDataRows(makeProcess(), makeClient(), t)

    expect(rows.map((r) => r.label)).toEqual([
      "portal.process.resumo.cnpj",
      "portal.process.resumo.instrument",
      "portal.process.resumo.agency",
      "portal.process.resumo.processingTime",
      "portal.process.resumo.responsibleTech",
      "portal.process.resumo.scope",
      "portal.process.resumo.applicant",
      "portal.process.resumo.clientContact",
      "portal.process.resumo.contactEmail",
      "portal.process.resumo.contactPhone",
    ])

    const value = valueOf(rows)
    expect(value("portal.process.resumo.cnpj")).toBe("12345678000190")
    expect(value("portal.process.resumo.instrument")).toBe(
      "LP — Licença Prévia, LI — Licença de Instalação",
    )
    expect(value("portal.process.resumo.scope")).toBe("Licenciamento da obra")
    expect(value("portal.process.resumo.applicant")).toBe("Requerente X")
    expect(value("portal.process.resumo.clientContact")).toBe("João Contato")
    expect(value("portal.process.resumo.contactEmail")).toBe("joao@exemplo.com")
    expect(value("portal.process.resumo.contactPhone")).toBe(
      "+55 22 99999-9999",
    )
  })

  it("renders an em-dash for empty or missing sources", () => {
    const rows = buildProjectDataRows(
      makeProcess({
        client_cnpj: null,
        license_types: [],
        environmental_agency: null,
        objective: "",
      }),
      makeClient({ contact_name: null, contact_email: "  " }),
      t,
    )

    const value = valueOf(rows)
    expect(value("portal.process.resumo.cnpj")).toBe("—")
    expect(value("portal.process.resumo.instrument")).toBe("—")
    expect(value("portal.process.resumo.agency")).toBe("—")
    expect(value("portal.process.resumo.scope")).toBe("—")
    expect(value("portal.process.resumo.clientContact")).toBe("—")
    expect(value("portal.process.resumo.contactEmail")).toBe("—")
  })
})
