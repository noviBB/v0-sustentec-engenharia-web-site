"use client"

import { useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { MessageRow } from "@/modules/messages/messages.repo"
import { markMessageReadAction } from "@/modules/messages/messages.controller"
import { ResultCode } from "@/lib/constants/result-codes"
import { ArrowDownLeft, ArrowUpRight, Mail, MailOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"

interface MessagesViewProps {
  messages: MessageRow[]
  /**
   * Called optimistically before the server action — the shell uses this to
   * decrement the unread badge and flip the row.
   */
  onMarkedRead: (messageId: string) => void
  /**
   * Called when the server action fails — rolls back the optimistic update.
   */
  onMarkReadFailed: (messageId: string) => void
}

function formatMessageDate(value: string | Date | null) {
  if (!value) return ""
  try {
    const d = value instanceof Date ? value : new Date(value)
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return String(value)
  }
}

/**
 * Compact DD/MM HH:mm formatter for the read-receipt tooltip. The longer
 * `formatMessageDate` reads as a paragraph; the read receipt sits inside a
 * tiny tooltip so it gets its own tight format.
 */
function formatReadAt(value: string | Date | null) {
  if (!value) return ""
  try {
    const d = value instanceof Date ? value : new Date(value)
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return String(value)
  }
}

export function MessagesView({
  messages,
  onMarkedRead,
  onMarkReadFailed,
}: MessagesViewProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // Ascending order — thread-style, most recent at the bottom.
  const sorted = [...messages].sort((a, b) => {
    const ta = a.sent_at ? new Date(a.sent_at).getTime() : 0
    const tb = b.sent_at ? new Date(b.sent_at).getTime() : 0
    return ta - tb
  })

  function handleClick(msg: MessageRow) {
    if (msg.read || msg.direction === "outbound") return
    // Optimistic: tell the parent to bump the counter immediately, then
    // run the mutation. If it fails we roll back via `onMarkReadFailed`
    // and surface a toast (with a correlation ref for server errors).
    onMarkedRead(msg.id)
    startTransition(async () => {
      const result = await markMessageReadAction(msg.id)
      if (!result.ok) {
        onMarkReadFailed(msg.id)
        const description =
          result.code === ResultCode.ServerError && result.ref
            ? `${t("portal.messages.error.server.description")} (ref ${result.ref})`
            : t("portal.messages.error.server.description")
        toast({
          variant: "destructive",
          title: t("portal.messages.error.server.title"),
          description,
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {t("portal.messages.title")}
        </h2>
        <p className="text-muted-foreground">
          {t("portal.messages.subtitle")}
        </p>
      </div>

      {sorted.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-16 text-center">
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium text-foreground">
              {t("portal.messages.empty.title")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("portal.messages.empty.description")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((msg) => {
            const isOutbound = msg.direction === "outbound"
            const isUnread = !msg.read && !isOutbound
            return (
              <Card
                key={msg.id}
                onClick={() => handleClick(msg)}
                className={cn(
                  "bg-white",
                  isOutbound && "ml-auto max-w-[88%] border-l-4 border-l-[#2d5a27]",
                  isUnread && "cursor-pointer ring-1 ring-[#2d5a27]/40",
                  isPending && "opacity-90",
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {!isOutbound && msg.read && msg.read_at ? (
                        // Tooltip wraps just the read-state icon so the rest
                        // of the row remains clickable for re-marking, etc.
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "p-2 rounded-lg cursor-help bg-[#e8f5e9]",
                              )}
                              aria-label={t(
                                "portal.messages.readAt",
                              ).replace("{date}", formatReadAt(msg.read_at))}
                            >
                              <MailOpen className="w-5 h-5 text-[#2d5a27]" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("portal.messages.readAt").replace(
                              "{date}",
                              formatReadAt(msg.read_at),
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            isOutbound ? "bg-[#2d5a27]/10" : "bg-[#e8f5e9]",
                          )}
                        >
                          {isOutbound ? (
                            <ArrowUpRight className="w-5 h-5 text-[#2d5a27]" />
                          ) : msg.read ? (
                            <MailOpen className="w-5 h-5 text-[#2d5a27]" />
                          ) : (
                            <Mail className="w-5 h-5 text-[#2d5a27]" />
                          )}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-semibold text-foreground">
                            {msg.subject ?? t("portal.messages.noSubject")}
                          </CardTitle>
                          <Badge
                            variant={isOutbound ? "default" : "secondary"}
                            className={cn(
                              "text-[10px] uppercase tracking-wide",
                              isOutbound && "bg-[#2d5a27] text-white"
                            )}
                          >
                            {isOutbound ? (
                              <span className="inline-flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3" />
                                {t("portal.messages.badge.outbound")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <ArrowDownLeft className="w-3 h-3" />
                                {t("portal.messages.badge.inbound")}
                              </span>
                            )}
                          </Badge>
                          {isUnread && (
                            <Badge className="text-[10px] bg-[#2d5a27] text-white">
                              {t("portal.messages.badge.unread")}
                            </Badge>
                          )}
                        </div>
                        {msg.from_addr && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("portal.messages.from")}{" "}
                            <span className="font-medium">{msg.from_addr}</span>
                          </p>
                        )}
                        {msg.to_addr && (
                          <p className="text-xs text-muted-foreground">
                            {t("portal.messages.to")}{" "}
                            <span className="font-medium">{msg.to_addr}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {formatMessageDate(msg.sent_at)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground whitespace-pre-line">{msg.body}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
