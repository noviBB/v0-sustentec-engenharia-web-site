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
        <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide">
          {t("portal.payments.dashboardTotal")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 rounded-xl">
            <CreditCard className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {brl.format(total)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("portal.payments.dashboardTotal")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
