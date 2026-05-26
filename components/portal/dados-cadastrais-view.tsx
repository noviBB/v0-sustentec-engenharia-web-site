"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building, User, Mail, Phone, MapPin, FileText } from "lucide-react"
import type { Client } from "@/lib/db/clients"
import { useLanguage } from "@/lib/language-context"

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
  const { t } = useLanguage()

  const fields: ReadonlyArray<{
    icon: typeof Building
    label: string
    value: string
  }> = [
    {
      icon: FileText,
      label: t("portal.dados.field.cnpj"),
      value: formatCnpj(client.notion_cnpj_filter),
    },
    // TODO(#22, cadastral fields): clients schema lacks these fields — placeholder until
    // cadastral columns (contact_name, contact_email, contact_phone, address_*) ship.
    { icon: User, label: t("portal.dados.field.responsibleLegal"), value: "—" },
    { icon: Mail, label: t("portal.dados.field.email"), value: "—" }, // TODO(#22, cadastral fields)
    { icon: Phone, label: t("portal.dados.field.phone"), value: "—" }, // TODO(#22, cadastral fields)
    { icon: MapPin, label: t("portal.dados.field.address"), value: "—" }, // TODO(#22, cadastral fields)
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {t("portal.dados.title")}
        </h2>
        <p className="text-muted-foreground">
          {t("portal.dados.subtitle")}
        </p>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wide flex items-center gap-2">
            <div className="p-1.5 bg-[#f5f1e6] border border-[#e5dcc5] rounded-lg">
              <Building className="w-4 h-4 text-[#2d5a27]" />
            </div>
            {t("portal.dados.section.client")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 p-4 mb-6 rounded-lg bg-[#f5f1e6] border border-[#e5dcc5]">
            <div className="p-2.5 bg-white rounded-xl">
              <Building className="w-6 h-6 text-[#2d5a27]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#2d5a27]/70">
                {t("portal.dados.section.client.eyebrow")}
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
