"use client"

import { useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { MessageRow } from "@/lib/db/messages"
import { markMessageReadAction } from "@/lib/actions/messages"
import { ArrowDownLeft, ArrowUpRight, Mail, MailOpen } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessagesViewProps {
  messages: MessageRow[]
  /**
   * Called after the server action confirms the mark-read — the shell
   * uses this to optimistically decrement the unread badge.
   */
  onMarkedRead: (messageId: string) => void
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

export function MessagesView({ messages, onMarkedRead }: MessagesViewProps) {
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
    // run the mutation. If it fails we leave the optimistic state alone
    // (next nav reconciles) — this is a low-stakes UX op.
    onMarkedRead(msg.id)
    startTransition(async () => {
      await markMessageReadAction(msg.id)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Mensagens</h2>
        <p className="text-muted-foreground">
          Conversa entre você e a equipe Sustentec, vinculada ao seu e-mail cadastrado.
        </p>
      </div>

      {sorted.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-16 text-center">
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium text-foreground">Nenhuma mensagem ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Você verá aqui as respostas enviadas pela equipe Sustentec.
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
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          isOutbound ? "bg-[#2d5a27]/10" : "bg-[#e8f5e9]"
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
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-semibold text-foreground">
                            {msg.subject ?? "(sem assunto)"}
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
                                Você enviou
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <ArrowDownLeft className="w-3 h-3" />
                                Recebida
                              </span>
                            )}
                          </Badge>
                          {isUnread && (
                            <Badge className="text-[10px] bg-[#2d5a27] text-white">
                              Não lida
                            </Badge>
                          )}
                        </div>
                        {msg.from_addr && (
                          <p className="text-xs text-muted-foreground mt-1">
                            De: <span className="font-medium">{msg.from_addr}</span>
                          </p>
                        )}
                        {msg.to_addr && (
                          <p className="text-xs text-muted-foreground">
                            Para: <span className="font-medium">{msg.to_addr}</span>
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
