"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building, User, Mail, Phone, MapPin, FileText } from "lucide-react"
import type { Client } from "@/lib/db/clients"

interface DadosCadastraisViewProps {
  client: Client
}

/** Formats a 14-digit BR CNPJ string as `XX.XXX.XXX/XXXX-XX`. */
function formatCnpj(raw: string | null | undefined): string {
  if (!raw) return "—"
  const digits = raw.replace(/\D/g, "")
  if (digits.length !== 14) return raw
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

export function DadosCadastraisView({ client }: DadosCadastraisViewProps) {
  const fields: ReadonlyArray<{
    icon: typeof Building
    label: string
    value: string
  }> = [
    { icon: FileText, label: "CNPJ", value: formatCnpj(client.notion_cnpj_filter) },
    // TODO(#19): clients schema lacks this field — placeholder until cadastral
    // columns (responsible_name, contact_email, phone, address) ship.
    { icon: User, label: "Responsável legal", value: "—" },
    { icon: Mail, label: "E-mail", value: "—" }, // TODO(#19): clients schema lacks this field
    { icon: Phone, label: "Telefone", value: "—" }, // TODO(#19): clients schema lacks this field
    { icon: MapPin, label: "Endereço", value: "—" }, // TODO(#19): clients schema lacks this field
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dados Cadastrais</h2>
        <p className="text-muted-foreground">
          Informações do cliente registradas no portal.
        </p>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wide flex items-center gap-2">
            <div className="p-1.5 bg-[#f5f1e6] border border-[#e5dcc5] rounded-lg">
              <Building className="w-4 h-4 text-[#2d5a27]" />
            </div>
            CLIENTE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 p-4 mb-6 rounded-lg bg-[#f5f1e6] border border-[#e5dcc5]">
            <div className="p-2.5 bg-white rounded-xl">
              <Building className="w-6 h-6 text-[#2d5a27]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#2d5a27]/70">
                Cliente
              </p>
              <p className="text-2xl font-bold text-foreground leading-tight">
                {client.name}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {fields.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="w-4 h-4 text-[#2d5a27] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
