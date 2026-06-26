"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

interface PaymentsDashboardCardProps {
  /** Sum of pending + overdue amounts across the client's processes. */
  total: number
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function PaymentsDashboardCard({ total }: PaymentsDashboardCardProps) {
  const { t } = useLanguage()

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground tracking-wide">
          {t("portal.payments.dashboardTotal")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 rounded-xl shrink-0">
            <CreditCard className="w-6 h-6 text-rose-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-foreground whitespace-nowrap tabular-nums leading-tight">
              {brl.format(total)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
