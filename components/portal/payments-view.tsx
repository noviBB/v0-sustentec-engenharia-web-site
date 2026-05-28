"use client"

import type { PaymentRow } from "@/lib/db/payments"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"

interface PaymentsViewProps {
  payments: PaymentRow[]
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("pt-BR").format(d)
}

const STATUS_CLASSES = {
  pending: "bg-blue-100 text-blue-800 border-blue-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  overdue: "bg-rose-100 text-rose-800 border-rose-200",
} as const

/**
 * Per-project installments table. Renders a tight 5-column layout
 * (Parcela / Vencimento / Valor / Status / Pago em) using the shadcn
 * `Table` primitives. All copy is i18n-keyed.
 */
export function PaymentsView({ payments }: PaymentsViewProps) {
  const { t } = useLanguage()

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-wide">
          {t("portal.payments.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            —
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("portal.payments.installment").replace("{n}", "")}</TableHead>
                <TableHead>{t("portal.payments.dueDate")}</TableHead>
                <TableHead className="text-right">
                  {t("portal.payments.amount")}
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>{t("portal.payments.paidOn").replace("{date}", "")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => {
                const statusKey = p.status as keyof typeof STATUS_CLASSES
                const statusLabel = t(`portal.payments.status.${p.status}`)
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {t("portal.payments.installment").replace(
                        "{n}",
                        String(p.installment_no),
                      )}
                    </TableCell>
                    <TableCell>{formatDate(p.due_date)}</TableCell>
                    <TableCell className="text-right">
                      {brl.format(Number(p.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "border text-xs font-medium",
                          STATUS_CLASSES[statusKey] ??
                            "bg-gray-100 text-gray-700 border-gray-200",
                        )}
                      >
                        {statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.paid_at ? formatDate(p.paid_at) : "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
