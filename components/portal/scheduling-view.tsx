"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Info,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const RESPONSIBLE_TECHS = [
  { id: "leonardo-martins", name: "Eng. Leonardo Martins" },
  { id: "ana-pereira", name: "Eng. Ana Pereira" },
]

const TIME_SLOTS = (() => {
  const slots: string[] = []
  for (let h = 9; h <= 17; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`)
    if (h < 17) slots.push(`${String(h).padStart(2, "0")}:30`)
  }
  return slots
})()

const ALLOWED_WEEKDAYS = new Set([1, 2, 3]) // Mon, Tue, Wed

function isDateDisabled(date: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (date < today) return true
  return !ALLOWED_WEEKDAYS.has(date.getDay())
}

function formatDateBR(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function SchedulingView() {
  const { toast } = useToast()
  const [tech, setTech] = useState("")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  const canSubmit =
    tech !== "" && date !== undefined && time !== "" && subject.trim() !== ""

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !date) return

    const payload = {
      responsavelTecnico: tech,
      data: date.toISOString().slice(0, 10),
      horario: time,
      assunto: subject.trim(),
      mensagem: message.trim() || null,
    }

    console.log("Agendamento solicitado:", payload)

    toast({
      title: "Solicitação enviada",
      description:
        "Confirmaremos seu agendamento em breve por e-mail ou WhatsApp.",
    })

    setTech("")
    setDate(undefined)
    setTime("")
    setSubject("")
    setMessage("")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Agendamentos</h2>
        <p className="text-muted-foreground">
          Marque uma reunião com seu responsável técnico em poucos cliques.
        </p>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wide flex items-center gap-2">
            <div className="p-1.5 bg-[#f5f1e6] border border-[#e5dcc5] rounded-lg">
              <CalendarIcon className="w-4 h-4 text-[#2d5a27]" />
            </div>
            AGENDAR REUNIÃO
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Office hours banner */}
          <div className="flex items-start gap-3 p-4 mb-6 rounded-lg bg-[#f5f1e6] border border-[#e5dcc5]">
            <div className="p-2 bg-white rounded-lg shrink-0">
              <Info className="w-4 h-4 text-[#2d5a27]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2d5a27]">
                Horário de atendimento
              </p>
              <p className="text-sm text-[#2d5a27]/80">
                Segunda a quarta-feira, das 09:00 às 17:30. Selecione abaixo
                uma data e um horário disponíveis.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Responsável técnico */}
            <div className="space-y-2">
              <Label htmlFor="tech" className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-4 h-4 text-[#2d5a27]" />
                Responsável técnico
              </Label>
              <Select value={tech} onValueChange={setTech}>
                <SelectTrigger id="tech">
                  <SelectValue placeholder="Selecione o responsável técnico" />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSIBLE_TECHS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Data */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <CalendarIcon className="w-4 h-4 text-[#2d5a27]" />
                  Data
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? formatDateBR(date) : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={isDateDisabled}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Disponível apenas de segunda a quarta-feira.
                </p>
              </div>

              {/* Horário */}
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="w-4 h-4 text-[#2d5a27]" />
                  Horário
                </Label>
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger id="time">
                    <SelectValue placeholder="Selecione um horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assunto */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">
                Assunto
              </Label>
              <Input
                id="subject"
                placeholder="Ex.: dúvidas sobre o protocolo do processo CC 26-016"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Mensagem */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">
                Mensagem <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="message"
                placeholder="Detalhe o que gostaria de discutir na reunião."
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="bg-[#2d5a27] hover:bg-[#1b3d19] text-white"
              >
                Solicitar agendamento
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
