"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { getMessagesForEmail } from "@/lib/portal-data"
import { Mail, MailOpen } from "lucide-react"

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
  const sorted = [...messages].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Mensagens</h2>
        <p className="text-muted-foreground">
          Respostas enviadas pela equipe Sustentec para o seu e-mail cadastrado.
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
          {sorted.map(msg => (
            <Card key={msg.id} className="bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#e8f5e9] rounded-lg">
                      {msg.read ? (
                        <MailOpen className="w-5 h-5 text-[#2d5a27]" />
                      ) : (
                        <Mail className="w-5 h-5 text-[#2d5a27]" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-foreground">
                        {msg.subject}
                      </CardTitle>
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
          ))}
        </div>
      )}
    </div>
  )
}
