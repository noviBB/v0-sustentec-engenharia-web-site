"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { getMessagesForEmail } from "@/lib/portal-data"
import { ArrowDownLeft, ArrowUpRight, Mail, MailOpen } from "lucide-react"
import { cn } from "@/lib/utils"

function formatMessageDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export function MessagesView() {
  const { user } = useAuth()
  const messages = getMessagesForEmail(user?.email)
  // Ascending order — thread-style, most recent at the bottom.
  const sorted = [...messages].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

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
          {sorted.map(msg => {
            const isOutbound = msg.direction === "outbound"
            return (
              <Card
                key={msg.id}
                className={cn(
                  "bg-white",
                  isOutbound && "ml-auto max-w-[88%] border-l-4 border-l-[#2d5a27]"
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
                            {msg.subject}
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
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          De: <span className="font-medium">{msg.from}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Para: <span className="font-medium">{msg.to}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {formatMessageDate(msg.date)}
                      </span>
                      {msg.processCode && (
                        <Badge variant="outline" className="text-xs">
                          {msg.processCode}
                        </Badge>
                      )}
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
