"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building, User, Mail, Phone, MapPin, FileText } from "lucide-react"

const fields = [
  {
    icon: FileText,
    label: "CNPJ",
    value: "00.000.000/0001-00",
  },
  {
    icon: User,
    label: "Responsável legal",
    value: "—",
  },
  {
    icon: Mail,
    label: "E-mail",
    value: "contato@engeprat.com.br",
  },
  {
    icon: Phone,
    label: "Telefone",
    value: "+55 21 0000-0000",
  },
  {
    icon: MapPin,
    label: "Endereço",
    value: "—",
  },
]

export function DadosCadastraisView() {
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
                Engeprat
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
