import { describe, it, expect } from "vitest"

import { ProcessStatus } from "@/lib/db/enums"
import { statusPinColor } from "../map-pin-color"

describe("statusPinColor", () => {
  it("maps Andamento to blue", () => {
    expect(statusPinColor(ProcessStatus.Andamento)).toBe("#2563eb")
  })

  it("maps Acompanhamento to amber", () => {
    expect(statusPinColor(ProcessStatus.Acompanhamento)).toBe("#d97706")
  })

  it("maps Finalizado to green", () => {
    expect(statusPinColor(ProcessStatus.Finalizado)).toBe("#16a34a")
  })

  it("maps Arquivado to neutral gray", () => {
    expect(statusPinColor(ProcessStatus.Arquivado)).toBe("#6b7280")
  })

  it("falls back to gray for an unknown value", () => {
    expect(statusPinColor("garbage" as ProcessStatus)).toBe("#6b7280")
  })
})
